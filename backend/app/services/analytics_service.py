from datetime import datetime

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
        inventory = inventory.join(Product).filter(Product.category_id == filters["category_id"])
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

    revenue = sales.with_entities(func.coalesce(func.sum(Sale.total_amount), 0)).scalar()
    orders = sales.count()
    units = items.with_entities(func.coalesce(func.sum(SaleItem.quantity), 0)).scalar()
    inventory_value = inventory.join(Product).with_entities(func.coalesce(func.sum(Inventory.available_stock * Product.cost_price), 0)).scalar()

    revenue_trend = items.with_entities(func.date(Sale.sale_date), func.sum(SaleItem.total)).group_by(func.date(Sale.sale_date)).order_by(func.date(Sale.sale_date)).all()
    top_products = items.join(Product).with_entities(Product.name, func.sum(SaleItem.quantity)).group_by(Product.name).order_by(func.sum(SaleItem.quantity).desc()).limit(10).all()
    categories = items.join(Category).with_entities(Category.name, func.sum(SaleItem.total)).group_by(Category.name).order_by(func.sum(SaleItem.total).desc()).all()
    payments = sales.with_entities(Sale.payment_method, func.sum(Sale.total_amount)).group_by(Sale.payment_method).all()
    channels = sales.with_entities(Sale.sales_channel, func.sum(Sale.total_amount)).group_by(Sale.sales_channel).all()
    inventory_categories = inventory.join(Product).join(Category).with_entities(Category.name, func.sum(Inventory.available_stock)).group_by(Category.name).all()
    stock_status = inventory.with_entities(Inventory.stock_status, func.count(Inventory.id)).group_by(Inventory.stock_status).all()
    low_stock = inventory.join(Product).filter(Inventory.stock_status == "LOW_STOCK").with_entities(Product.name, Product.sku, Inventory.available_stock, Inventory.reorder_level).order_by(Inventory.available_stock).limit(10).all()
    out_of_stock = inventory.join(Product).filter(Inventory.stock_status == "OUT_OF_STOCK").with_entities(Product.name, Product.sku).limit(10).all()

    return {
        "kpis": {"total_revenue": float(revenue or 0), "total_orders": orders, "products_sold": int(units or 0), "average_order_value": float(revenue or 0) / orders if orders else 0, "inventory_value": float(inventory_value or 0), "low_stock_products": inventory.filter(Inventory.stock_status == "LOW_STOCK").count(), "out_of_stock_products": inventory.filter(Inventory.stock_status == "OUT_OF_STOCK").count(), "total_categories": db.query(Category).filter(Category.company_id == user.company_id).count()},
        "revenue_trend": [{"date": str(date), "value": float(value or 0)} for date, value in revenue_trend],
        "top_products": [{"name": name, "value": int(value or 0)} for name, value in top_products],
        "categories": [{"name": name, "value": float(value or 0)} for name, value in categories],
        "payments": [{"name": name, "value": float(value or 0)} for name, value in payments],
        "channels": [{"name": name, "value": float(value or 0)} for name, value in channels],
        "inventory_categories": [{"name": name, "value": int(value or 0)} for name, value in inventory_categories],
        "stock_status": [{"name": name, "value": int(value or 0)} for name, value in stock_status],
        "low_stock": [{"name": name, "sku": sku, "available": available, "reorder_level": reorder} for name, sku, available, reorder in low_stock],
        "out_of_stock": [{"name": name, "sku": sku} for name, sku in out_of_stock],
    }


def audit_dashboard(db: Session, user, action: str):
    create_audit_log(db, user.company_id, user.id, action, commit=True, entity_type="DASHBOARD")
