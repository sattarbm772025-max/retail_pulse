from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, or_, text
from sqlalchemy.orm import joinedload

from app.models.product import Product
from app.models.customer import Customer
from app.models.sale import Sale, SaleItem
from app.services.audit_service import create_audit_log
from app.services.customer_service import (
    recalculate_customer_summary,
    record_sale_for_customer,
)
from app.services.inventory_service import apply_movement, ensure_inventory

LOW_STOCK_THRESHOLD = 10


# =================================================
# Generate Invoice Number
# =================================================


def _invoice(db, company_id):
    # PostgreSQL transaction advisory lock serializes invoice allocation per company.
    # The database unique constraint remains the final integrity guarantee.
    db.execute(
        text("SELECT pg_advisory_xact_lock(:company_id)"), {"company_id": company_id}
    )
    year = datetime.now(timezone.utc).year

    prefix = f"INV-{year}-"

    latest = (
        db.query(Sale.invoice_number)
        .filter(Sale.company_id == company_id, Sale.invoice_number.like(f"{prefix}%"))
        .order_by(Sale.invoice_number.desc())
        .first()
    )

    number = int(latest[0].split("-")[-1]) + 1 if latest else 1

    return f"{prefix}{number:06d}"


# =================================================
# Serialize Sale Response
# =================================================


def _serialize(sale):

    return {
        "id": sale.id,
        "invoice_number": sale.invoice_number,
        "customer_name": sale.customer_name,
        "customer_id": sale.customer_id,
        "sale_date": sale.sale_date,
        "sales_channel": sale.sales_channel,
        "payment_method": sale.payment_method,
        "payment_status": sale.payment_status,
        "notes": sale.notes,
        "total_amount": sale.total_amount,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name,
                "category_id": item.category_id,
                "category_name": item.category.name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "discount": item.discount,
                "tax": item.tax,
                "total": item.total,
            }
            for item in sale.items
        ],
    }


# =================================================
# Product Names
# =================================================


def _product_names(db, sale):

    product_ids = [item.product_id for item in sale.items]

    if not product_ids:
        return "None"

    names = db.query(Product.name).filter(Product.id.in_(product_ids)).all()

    return ", ".join(name for (name,) in names)


# =================================================
# Adjust Inventory Stock
# =================================================


def _adjust_stock(db, current_user, item, direction):

    product = (
        db.query(Product)
        .filter(
            Product.id == item.product_id, Product.company_id == current_user.company_id
        )
        .with_for_update()
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=422, detail="Product does not belong to your company"
        )

    inventory = ensure_inventory(db, product)

    if direction < 0:

        if product.status != "ACTIVE":

            raise HTTPException(
                status_code=422, detail=f"{product.name} is not available for sales"
            )

        if inventory.available_stock < item.quantity:

            raise HTTPException(
                status_code=422,
                detail=f"Insufficient stock for {product.name}. Available: {inventory.available_stock}",
            )

    apply_movement(
        db, current_user, product, "SALE", direction * item.quantity, "Sale transaction"
    )

    return product


# =================================================
# Create Sale Object
# =================================================


def _make_sale(db, current_user, request, invoice_number=None):

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == request.customer_id,
            Customer.company_id == current_user.company_id,
            Customer.status == "ACTIVE",
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Active customer not found")

    sale = Sale(
        company_id=current_user.company_id,
        invoice_number=(invoice_number or _invoice(db, current_user.company_id)),
        customer_id=customer.id,
        customer_name=customer.full_name,
        sale_date=(request.sale_date or datetime.now(timezone.utc)),
        sales_channel=request.sales_channel,
        payment_method=request.payment_method,
        payment_status=request.payment_status,
        notes=request.notes,
        total_amount=Decimal("0"),
        created_by=current_user.id,
    )

    db.add(sale)

    db.flush()

    total = Decimal("0")

    for input_item in request.items:

        product = _adjust_stock(db, current_user, input_item, -1)

        unit_price = Decimal(str(input_item.unit_price))
        discount = Decimal(str(input_item.discount))
        tax = Decimal(str(input_item.tax))
        line_total = input_item.quantity * unit_price - discount + tax

        sale.items.append(
            SaleItem(
                product_id=product.id,
                category_id=product.category_id,
                quantity=input_item.quantity,
                unit_price=unit_price,
                discount=discount,
                tax=tax,
                total=line_total,
            )
        )

        total += line_total

    sale.total_amount = total

    return sale


# =================================================
# Create Sale
# =================================================


def create_sale(db, current_user, request):

    sale = _make_sale(db, current_user, request)

    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        f"Sale Created: {sale.invoice_number} | Products: {_product_names(db, sale)}",
        commit=False,
    )

    record_sale_for_customer(
        db,
        current_user,
        sale,
        sum(item.quantity for item in sale.items),
    )

    db.commit()

    db.refresh(sale)

    return _serialize(sale)


# =================================================
# Get Sales
# =================================================


def get_sales(
    db,
    current_user,
    search=None,
    date_from=None,
    date_to=None,
    category_id=None,
    sales_channel=None,
    payment_method=None,
    sort="date",
    payment_status=None,
):

    query = (
        db.query(Sale)
        .options(
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.items).joinedload(SaleItem.category),
        )
        .filter(Sale.company_id == current_user.company_id)
    )

    if search:

        term = f"%{search}%"

        query = (
            query.outerjoin(SaleItem)
            .outerjoin(Product)
            .filter(
                or_(
                    Sale.invoice_number.ilike(term),
                    Sale.customer_name.ilike(term),
                    Product.name.ilike(term),
                )
            )
        )

    if date_from:
        query = query.filter(Sale.sale_date >= date_from)

    if date_to:
        query = query.filter(Sale.sale_date <= date_to)

    if category_id:

        query = query.join(SaleItem).filter(SaleItem.category_id == category_id)

    if sales_channel:

        query = query.filter(Sale.sales_channel == sales_channel.upper())

    if payment_method:

        query = query.filter(Sale.payment_method == payment_method.upper())

    if payment_status:

        query = query.filter(Sale.payment_status == payment_status.upper())

    order = {
        "date": Sale.sale_date.desc(),
        "invoice": Sale.invoice_number.asc(),
        "total": Sale.total_amount.desc(),
    }

    return [
        _serialize(sale)
        for sale in query.order_by(order.get(sort, order["date"])).distinct().all()
    ]


# =================================================
# Get Single Sale
# =================================================


def get_sale(db, current_user, sale_id):

    sale = (
        db.query(Sale)
        .options(
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.items).joinedload(SaleItem.category),
        )
        .filter(Sale.id == sale_id, Sale.company_id == current_user.company_id)
        .first()
    )

    if not sale:

        raise HTTPException(status_code=404, detail="Sale not found")

    return _serialize(sale)


# =================================================
# Update Sale
# =================================================


def update_sale(db, current_user, sale_id, request):

    sale = (
        db.query(Sale)
        .options(joinedload(Sale.items))
        .filter(Sale.id == sale_id, Sale.company_id == current_user.company_id)
        .first()
    )

    if not sale:

        raise HTTPException(status_code=404, detail="Sale not found")

    previous_customer_id = sale.customer_id

    for item in sale.items:

        _adjust_stock(db, current_user, item, 1)

    sale.items.clear()

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == request.customer_id,
            Customer.company_id == current_user.company_id,
            Customer.status == "ACTIVE",
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Active customer not found")

    sale.customer_id = customer.id
    sale.customer_name = customer.full_name

    sale.sale_date = request.sale_date or sale.sale_date

    sale.sales_channel = request.sales_channel

    sale.payment_method = request.payment_method
    sale.payment_status = request.payment_status
    sale.notes = request.notes

    total = 0

    for input_item in request.items:

        product = _adjust_stock(db, current_user, input_item, -1)

        line_total = (
            input_item.quantity * input_item.unit_price
            - input_item.discount
            + input_item.tax
        )

        sale.items.append(
            SaleItem(
                product_id=product.id,
                category_id=product.category_id,
                quantity=input_item.quantity,
                unit_price=input_item.unit_price,
                discount=input_item.discount,
                tax=input_item.tax,
                total=line_total,
            )
        )

        total += line_total

    sale.total_amount = total

    if previous_customer_id and previous_customer_id != sale.customer_id:
        recalculate_customer_summary(db, current_user, previous_customer_id)
    recalculate_customer_summary(db, current_user, sale.customer_id)

    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        f"Sale Updated: {sale.invoice_number} | Products: {_product_names(db, sale)}",
        commit=False,
    )

    db.commit()

    db.refresh(sale)

    return _serialize(sale)


# =================================================
# Delete Sale
# =================================================


def delete_sale(db, current_user, sale_id):

    sale = (
        db.query(Sale)
        .options(joinedload(Sale.items))
        .filter(Sale.id == sale_id, Sale.company_id == current_user.company_id)
        .first()
    )

    if not sale:

        raise HTTPException(status_code=404, detail="Sale not found")

    invoice = sale.invoice_number
    customer_id = sale.customer_id

    products = _product_names(db, sale)

    for item in sale.items:

        _adjust_stock(db, current_user, item, 1)

    db.delete(sale)
    db.flush()
    if customer_id:
        recalculate_customer_summary(db, current_user, customer_id)

    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        f"Sale Deleted: {invoice} | Products: {products}",
        commit=False,
    )

    db.commit()

    return {"message": "Sale deleted and inventory restored"}


# =================================================
# Sales Summary
# =================================================


def summary(db, current_user):

    base = db.query(Sale).filter(Sale.company_id == current_user.company_id)

    total_orders = base.count()

    revenue = base.with_entities(func.coalesce(func.sum(Sale.total_amount), 0)).scalar()

    return {
        "total_sales": float(revenue),
        "total_revenue": float(revenue),
        "total_orders": total_orders,
        "average_order_value": float(revenue / total_orders) if total_orders else 0,
    }
