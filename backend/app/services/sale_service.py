from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from app.models.notification import Notification
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.services.audit_service import create_audit_log

LOW_STOCK_THRESHOLD = 10


def _invoice(db, company_id):
    year = datetime.now(timezone.utc).year
    prefix = f"INV-{year}-"
    latest = db.query(Sale.invoice_number).filter(Sale.company_id == company_id, Sale.invoice_number.like(f"{prefix}%")).order_by(Sale.invoice_number.desc()).first()
    number = int(latest[0].split("-")[-1]) + 1 if latest else 1
    return f"{prefix}{number:06d}"


def _serialize(sale):
    return {"id": sale.id, "invoice_number": sale.invoice_number, "customer_name": sale.customer_name, "sale_date": sale.sale_date,
            "sales_channel": sale.sales_channel, "payment_method": sale.payment_method, "total_amount": sale.total_amount,
            "items": [{"id": item.id, "product_id": item.product_id, "product_name": item.product.name, "category_id": item.category_id,
                       "category_name": item.category.name, "quantity": item.quantity, "unit_price": item.unit_price, "discount": item.discount,
                       "tax": item.tax, "total": item.total} for item in sale.items]}


def _product_names(db, sale):
    product_ids = [item.product_id for item in sale.items]
    if not product_ids:
        return "None"
    names = db.query(Product.name).filter(Product.id.in_(product_ids)).all()
    return ", ".join(name for (name,) in names)


def _adjust_stock(db, current_user, item, direction):
    product = db.query(Product).filter(Product.id == item.product_id, Product.company_id == current_user.company_id).with_for_update().first()
    if not product:
        raise HTTPException(status_code=422, detail="Product does not belong to your company")
    if direction < 0:
        if product.status != "ACTIVE":
            raise HTTPException(status_code=422, detail=f"{product.name} is not available for sales")
        if product.stock_quantity < item.quantity:
            raise HTTPException(status_code=422, detail=f"Insufficient stock for {product.name}. Available: {product.stock_quantity}")
    product.stock_quantity += direction * item.quantity
    if product.stock_quantity == 0:
        product.status = "OUT_OF_STOCK"
        db.add(Notification(company_id=current_user.company_id, product_id=product.id, level="OUT_OF_STOCK", message=f"{product.name} is out of stock."))
        create_audit_log(db, current_user.company_id, current_user.id, f"Product Marked Out of Stock: {product.name}", commit=False)
    elif product.stock_quantity <= LOW_STOCK_THRESHOLD:
        db.add(Notification(company_id=current_user.company_id, product_id=product.id, level="LOW_STOCK", message=f"{product.name} is low in stock ({product.stock_quantity} remaining)."))
    elif direction > 0 and product.status == "OUT_OF_STOCK":
        product.status = "ACTIVE"
    create_audit_log(db, current_user.company_id, current_user.id, f"Inventory Updated: {product.name}", commit=False)
    return product


def _make_sale(db, current_user, request, invoice_number=None):
    sale = Sale(company_id=current_user.company_id, invoice_number=invoice_number or _invoice(db, current_user.company_id), customer_name=request.customer_name,
                sale_date=request.sale_date or datetime.now(timezone.utc), sales_channel=request.sales_channel, payment_method=request.payment_method, total_amount=0, created_by=current_user.id)
    db.add(sale); db.flush(); total = 0
    for input_item in request.items:
        product = _adjust_stock(db, current_user, input_item, -1)
        line_total = input_item.quantity * input_item.unit_price - input_item.discount + input_item.tax
        sale.items.append(SaleItem(product_id=product.id, category_id=product.category_id, quantity=input_item.quantity, unit_price=input_item.unit_price, discount=input_item.discount, tax=input_item.tax, total=line_total))
        total += line_total
    sale.total_amount = total
    return sale


def create_sale(db, current_user, request):
    sale = _make_sale(db, current_user, request)
    create_audit_log(db, current_user.company_id, current_user.id, f"Sale Created: {sale.invoice_number} | Products: {_product_names(db, sale)}", commit=False)
    db.commit(); db.refresh(sale)
    return _serialize(sale)


def get_sales(db, current_user, search=None, date_from=None, date_to=None, category_id=None, sales_channel=None, payment_method=None, sort="date"):
    query = db.query(Sale).options(joinedload(Sale.items).joinedload(SaleItem.product), joinedload(Sale.items).joinedload(SaleItem.category)).filter(Sale.company_id == current_user.company_id)
    if search:
        term = f"%{search}%"; query = query.outerjoin(SaleItem).outerjoin(Product).filter(or_(Sale.invoice_number.ilike(term), Sale.customer_name.ilike(term), Product.name.ilike(term)))
    if date_from: query = query.filter(Sale.sale_date >= date_from)
    if date_to: query = query.filter(Sale.sale_date <= date_to)
    if category_id: query = query.join(SaleItem).filter(SaleItem.category_id == category_id)
    if sales_channel: query = query.filter(Sale.sales_channel == sales_channel.upper())
    if payment_method: query = query.filter(Sale.payment_method == payment_method.upper())
    order = {"date": Sale.sale_date.desc(), "invoice": Sale.invoice_number.asc(), "total": Sale.total_amount.desc()}
    return [_serialize(sale) for sale in query.order_by(order.get(sort, order["date"])).distinct().all()]


def get_sale(db, current_user, sale_id):
    sale = db.query(Sale).options(joinedload(Sale.items).joinedload(SaleItem.product), joinedload(Sale.items).joinedload(SaleItem.category)).filter(Sale.id == sale_id, Sale.company_id == current_user.company_id).first()
    if not sale: raise HTTPException(status_code=404, detail="Sale not found")
    return _serialize(sale)


def update_sale(db, current_user, sale_id, request):
    sale = db.query(Sale).options(joinedload(Sale.items)).filter(Sale.id == sale_id, Sale.company_id == current_user.company_id).first()
    if not sale: raise HTTPException(status_code=404, detail="Sale not found")
    for item in sale.items: _adjust_stock(db, current_user, item, 1)
    sale.items.clear()
    sale.customer_name = request.customer_name
    sale.sale_date = request.sale_date or sale.sale_date
    sale.sales_channel = request.sales_channel
    sale.payment_method = request.payment_method
    total = 0
    for input_item in request.items:
        product = _adjust_stock(db, current_user, input_item, -1)
        line_total = input_item.quantity * input_item.unit_price - input_item.discount + input_item.tax
        sale.items.append(SaleItem(product_id=product.id, category_id=product.category_id, quantity=input_item.quantity, unit_price=input_item.unit_price, discount=input_item.discount, tax=input_item.tax, total=line_total))
        total += line_total
    sale.total_amount = total
    create_audit_log(db, current_user.company_id, current_user.id, f"Sale Updated: {sale.invoice_number} | Products: {_product_names(db, sale)}", commit=False)
    db.commit(); db.refresh(sale)
    return _serialize(sale)


def delete_sale(db, current_user, sale_id):
    sale = db.query(Sale).options(joinedload(Sale.items)).filter(Sale.id == sale_id, Sale.company_id == current_user.company_id).first()
    if not sale: raise HTTPException(status_code=404, detail="Sale not found")
    invoice = sale.invoice_number
    products = _product_names(db, sale)
    for item in sale.items: _adjust_stock(db, current_user, item, 1)
    db.delete(sale)
    create_audit_log(db, current_user.company_id, current_user.id, f"Sale Deleted: {invoice} | Products: {products}", commit=False)
    db.commit(); return {"message": "Sale deleted and inventory restored"}


def summary(db, current_user):
    base = db.query(Sale).filter(Sale.company_id == current_user.company_id)
    total_orders = base.count(); revenue = base.with_entities(func.coalesce(func.sum(Sale.total_amount), 0)).scalar()
    return {"total_sales": float(revenue), "total_revenue": float(revenue), "total_orders": total_orders, "average_order_value": float(revenue / total_orders) if total_orders else 0}
