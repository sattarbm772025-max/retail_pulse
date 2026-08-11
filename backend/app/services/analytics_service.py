
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.services.audit_service import create_audit_log


def dashboard(db: Session, user, filters: dict):
    sales = db.query(Sale).filter(Sale.company_id == user.company_id)
    items = db.query(SaleItem).join(Sale).filter(Sale.company_id == user.company_id)
    products = db.query(Product).filter(Product.company_id == user.company_id)
    inventory = db.query(Inventory).filter(Inventory.company_id == user.company_id)

    if filters.get("from_date"):
        sales = sales.filter(Sale.sale_date >= filters["from_date"])
        items = items.filter(Sale.sale_date >= filters["from_date"])
    if filters.get("to_date"):
        sales = sales.filter(Sale.sale_date <= filters["to_date"])
        items = items.filter(Sale.sale_date <= filters["to_date"])
    if filters.get("category_id"):
        items = items.filter(SaleItem.category_id == filters["category_id"])
        products = products.filter(Product.category_id == filters["category_id"])
        inventory = inventory.join(Product).filter(
            Product.category_id == filters["category_id"]
        )
    if filters.get("product_id"):
        items = items.filter(SaleItem.product_id == filters["product_id"])
        products = products.filter(Product.id == filters["product_id"])
        inventory = inventory.filter(Inventory.product_id == filters["product_id"])
    if filters.get("brand"):
        items = items.join(Product).filter(Product.brand.ilike(f"%{filters['brand']}%"))
        products = products.filter(Product.brand.ilike(f"%{filters['brand']}%"))
    if filters.get("channel"):
        sales = sales.filter(Sale.sales_channel == filters["channel"])
        items = items.filter(Sale.sales_channel == filters["channel"])
    if filters.get("payment_method"):
        sales = sales.filter(Sale.payment_method == filters["payment_method"])
        items = items.filter(Sale.payment_method == filters["payment_method"])

    revenue = sales.with_entities(
        func.coalesce(func.sum(Sale.total_amount), 0)
    ).scalar()
    orders = sales.count()
    units = items.with_entities(func.coalesce(func.sum(SaleItem.quantity), 0)).scalar()
    inventory_value = (
        inventory.join(Product)
        .with_entities(
            func.coalesce(func.sum(Inventory.available_stock * Product.cost_price), 0)
        )
        .scalar()
    )

    revenue_trend = (
        items.with_entities(func.date(Sale.sale_date), func.sum(SaleItem.total))
        .group_by(func.date(Sale.sale_date))
        .order_by(func.date(Sale.sale_date))
        .all()
    )
    top_products = (
        items.join(Product)
        .with_entities(Product.name, func.sum(SaleItem.quantity))
        .group_by(Product.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(10)
        .all()
    )
    categories = (
        items.join(Category)
        .with_entities(Category.name, func.sum(SaleItem.total))
        .group_by(Category.name)
        .order_by(func.sum(SaleItem.total).desc())
        .all()
    )
    payments = (
        sales.with_entities(Sale.payment_method, func.sum(Sale.total_amount))
        .group_by(Sale.payment_method)
        .all()
    )
    channels = (
        sales.with_entities(Sale.sales_channel, func.sum(Sale.total_amount))
        .group_by(Sale.sales_channel)
        .all()
    )
    inventory_categories = (
        inventory.join(Product)
        .join(Category)
        .with_entities(Category.name, func.sum(Inventory.available_stock))
        .group_by(Category.name)
        .all()
    )
    stock_status = (
        inventory.with_entities(Inventory.stock_status, func.count(Inventory.id))
        .group_by(Inventory.stock_status)
        .all()
    )
    low_stock = (
        inventory.join(Product)
        .filter(Inventory.stock_status == "LOW_STOCK")
        .with_entities(
            Product.name,
            Product.sku,
            Inventory.available_stock,
            Inventory.reorder_level,
        )
        .order_by(Inventory.available_stock)
        .limit(10)
        .all()
    )
    out_of_stock = (
        inventory.join(Product)
        .filter(Inventory.stock_status == "OUT_OF_STOCK")
        .with_entities(Product.name, Product.sku)
        .limit(10)
        .all()
    )

    return {
        "kpis": {
            "total_revenue": float(revenue or 0),
            "total_orders": orders,
            "products_sold": int(units or 0),
            "average_order_value": float(revenue or 0) / orders if orders else 0,
            "inventory_value": float(inventory_value or 0),
            "low_stock_products": inventory.filter(
                Inventory.stock_status == "LOW_STOCK"
            ).count(),
            "out_of_stock_products": inventory.filter(
                Inventory.stock_status == "OUT_OF_STOCK"
            ).count(),
            "total_categories": db.query(Category)
            .filter(Category.company_id == user.company_id)
            .count(),
        },
        "revenue_trend": [
            {"date": str(date), "value": float(value or 0)}
            for date, value in revenue_trend
        ],
        "top_products": [
            {"name": name, "value": int(value or 0)} for name, value in top_products
        ],
        "categories": [
            {"name": name, "value": float(value or 0)} for name, value in categories
        ],
        "payments": [
            {"name": name, "value": float(value or 0)} for name, value in payments
        ],
        "channels": [
            {"name": name, "value": float(value or 0)} for name, value in channels
        ],
        "inventory_categories": [
            {"name": name, "value": int(value or 0)}
            for name, value in inventory_categories
        ],
        "stock_status": [
            {"name": name, "value": int(value or 0)} for name, value in stock_status
        ],
        "low_stock": [
            {"name": name, "sku": sku, "available": available, "reorder_level": reorder}
            for name, sku, available, reorder in low_stock
        ],
        "out_of_stock": [{"name": name, "sku": sku} for name, sku in out_of_stock],
    }


def product_analytics(db: Session, user):
    rows = (
        db.query(
            Product.id,
            Product.name,
            Category.name.label("category"),
            Product.brand,
            func.coalesce(func.sum(SaleItem.quantity), 0).label("units_sold"),
            func.coalesce(func.sum(SaleItem.total), 0).label("revenue"),
            func.coalesce(Inventory.available_stock, 0).label("stock"),
        )
        .outerjoin(SaleItem, SaleItem.product_id == Product.id)
        .outerjoin(Category, Category.id == Product.category_id)
        .outerjoin(
            Inventory,
            (Inventory.product_id == Product.id)
            & (Inventory.company_id == user.company_id),
        )
        .filter(Product.company_id == user.company_id)
        .group_by(
            Product.id,
            Product.name,
            Category.name,
            Product.brand,
            Inventory.available_stock,
        )
        .order_by(func.sum(SaleItem.total).desc().nullslast())
        .all()
    )

    return [
        {
            "id": row.id,
            "name": row.name,
            "category": row.category,
            "brand": row.brand,
            "units_sold": int(row.units_sold or 0),
            "revenue": float(row.revenue or 0),
            "stock": int(row.stock or 0),
        }
        for row in rows
    ]


def product_details(db: Session, user, product_id: int):
    product = (
        db.query(Product)
        .filter(
            Product.company_id == user.company_id,
            Product.id == product_id,
        )
        .first()
    )

    if not product:
        return None

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.company_id == user.company_id,
            Inventory.product_id == product_id,
        )
        .first()
    )

    sales = (
        db.query(
            Sale.invoice_number,
            Sale.sale_date,
            SaleItem.quantity,
            SaleItem.unit_price,
            SaleItem.total,
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(
            Sale.company_id == user.company_id,
            SaleItem.product_id == product_id,
        )
        .order_by(Sale.sale_date.desc())
        .all()
    )

    total_units = sum(s.quantity for s in sales)
    total_revenue = sum(float(s.total or 0) for s in sales)

    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "brand": product.brand,
        "description": product.description,
        "unit_price": product.unit_price,
        "cost_price": product.cost_price,
        "stock": inventory.available_stock if inventory else 0,
        "reorder_level": inventory.reorder_level if inventory else 0,
        "status": inventory.stock_status if inventory else "UNKNOWN",
        "total_units_sold": total_units,
        "total_revenue": total_revenue,
        "sales_history": [
            {
                "invoice": s.invoice_number,
                "date": s.sale_date.isoformat(),
                "quantity": s.quantity,
                "price": s.unit_price,
                "total": float(s.total or 0),
            }
            for s in sales
        ],
    }


def category_details(db: Session, user, category_id: int):
    category = (
        db.query(Category)
        .filter(
            Category.company_id == user.company_id,
            Category.id == category_id,
        )
        .first()
    )

    if not category:
        return None

    products = (
        db.query(Product)
        .filter(
            Product.company_id == user.company_id,
            Product.category_id == category_id,
        )
        .all()
    )

    product_ids = [p.id for p in products]

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.company_id == user.company_id,
            Inventory.product_id.in_(product_ids) if product_ids else False,
        )
        .all()
    )

    sales = (
        db.query(
            SaleItem.quantity,
            SaleItem.total,
        )
        .join(Product, Product.id == SaleItem.product_id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(
            Sale.company_id == user.company_id,
            Product.category_id == category_id,
        )
        .all()
    )

    total_products = len(products)
    total_stock = sum(i.available_stock for i in inventory)
    total_units = sum(s.quantity for s in sales)
    total_revenue = sum(float(s.total or 0) for s in sales)

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "total_products": total_products,
        "total_stock": total_stock,
        "total_units_sold": total_units,
        "total_revenue": total_revenue,
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "brand": p.brand,
                "price": p.unit_price,
            }
            for p in products
        ],
    }


def audit_dashboard(db: Session, user, action: str):
    create_audit_log(
        db, user.company_id, user.id, action, commit=True, entity_type="DASHBOARD"
    )
