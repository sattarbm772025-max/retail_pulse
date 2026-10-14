"""Task 15 report generation over existing RetailPulse business data."""

from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.customer import Customer, CustomerPurchaseSummary
from app.models.inventory import Inventory, InventoryMovement
from app.models.product import Product
from app.models.report import ReportHistory
from app.models.sale import Sale, SaleItem

REPORT_TYPES = {
    "sales": "Sales Report",
    "inventory": "Inventory Report",
    "customers": "Customer Report",
    "product_performance": "Product Performance Report",
    "stock_movement": "Stock Movement Report",
}


def _value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _filters_for_history(filters: dict) -> dict:
    return {key: _value(value) for key, value in filters.items() if value not in (None, "")}


def _report_response(columns: list[dict], rows, total: int, page: int, page_size: int, report_type: str, filters: dict):
    return {
        "report_type": report_type,
        "report_name": REPORT_TYPES[report_type],
        "columns": columns,
        "rows": [{key: _value(value) for key, value in row.items()} for row in rows],
        "pagination": {"page": page, "page_size": page_size, "total": total, "pages": max((total + page_size - 1) // page_size, 1)},
        "applied_filters": _filters_for_history(filters),
    }


def _sales_query(db: Session, user, filters: dict):
    query = db.query(Sale).filter(Sale.company_id == user.company_id)
    if filters.get("date_from"):
        query = query.filter(Sale.sale_date >= filters["date_from"])
    if filters.get("date_to"):
        query = query.filter(Sale.sale_date <= filters["date_to"])
    if filters.get("customer_id"):
        query = query.filter(Sale.customer_id == filters["customer_id"])
    if filters.get("sales_status"):
        query = query.filter(Sale.payment_status == filters["sales_status"])
    if filters.get("product_id") or filters.get("category_id") or filters.get("brand"):
        query = query.join(SaleItem, SaleItem.sale_id == Sale.id).join(Product, Product.id == SaleItem.product_id)
        if filters.get("product_id"):
            query = query.filter(SaleItem.product_id == filters["product_id"])
        if filters.get("category_id"):
            query = query.filter(SaleItem.category_id == filters["category_id"])
        if filters.get("brand"):
            query = query.filter(Product.brand.ilike(f"%{filters['brand']}%"))
        query = query.distinct()
    return query


def generate_report(db: Session, user, report_type: str, filters: dict, page: int, page_size: int, sort_by: str, sort_direction: str):
    if report_type not in REPORT_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported report type")
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(status_code=422, detail="page must be positive and page_size must be between 1 and 100")
    if sort_direction not in {"asc", "desc"}:
        raise HTTPException(status_code=422, detail="sort_direction must be asc or desc")

    if report_type == "sales":
        query = _sales_query(db, user, filters)
        ordering = {"date": Sale.sale_date, "amount": Sale.total_amount, "invoice": Sale.invoice_number}.get(sort_by, Sale.sale_date)
        total = query.count()
        records = query.order_by(ordering.asc() if sort_direction == "asc" else ordering.desc()).offset((page - 1) * page_size).limit(page_size).all()
        rows = [{"invoice": sale.invoice_number, "date": sale.sale_date, "customer": sale.customer_name, "payment_method": sale.payment_method, "payment_status": sale.payment_status, "amount": sale.total_amount} for sale in records]
        columns = [{"key": key, "label": label} for key, label in [("invoice", "Invoice"), ("date", "Date"), ("customer", "Customer"), ("payment_method", "Payment"), ("payment_status", "Status"), ("amount", "Amount")]]

    elif report_type == "inventory":
        query = db.query(Product, Category.name.label("category"), Inventory.current_stock, Inventory.available_stock, Inventory.reorder_level, Inventory.stock_status).join(Category, Category.id == Product.category_id).outerjoin(Inventory, Inventory.product_id == Product.id).filter(Product.company_id == user.company_id)
        if filters.get("product_id"):
            query = query.filter(Product.id == filters["product_id"])
        if filters.get("category_id"):
            query = query.filter(Product.category_id == filters["category_id"])
        if filters.get("brand"):
            query = query.filter(Product.brand.ilike(f"%{filters['brand']}%"))
        if filters.get("stock_status"):
            query = query.filter(Inventory.stock_status == filters["stock_status"])
        ordering = {"product": Product.name, "stock": Inventory.current_stock, "updated": Inventory.updated_at}.get(sort_by, Product.name)
        total = query.count()
        records = query.order_by(ordering.asc() if sort_direction == "asc" else ordering.desc()).offset((page - 1) * page_size).limit(page_size).all()
        rows = [{"product": item.Product.name, "sku": item.Product.sku, "category": item.category, "brand": item.Product.brand, "current_stock": item.current_stock or 0, "available_stock": item.available_stock or 0, "reorder_level": item.reorder_level or 0, "stock_status": item.stock_status or "NOT_TRACKED"} for item in records]
        columns = [{"key": key, "label": label} for key, label in [("product", "Product"), ("sku", "SKU"), ("category", "Category"), ("brand", "Brand"), ("current_stock", "Current Stock"), ("available_stock", "Available"), ("reorder_level", "Reorder Level"), ("stock_status", "Stock Status")]]

    elif report_type == "customers":
        query = db.query(Customer, CustomerPurchaseSummary).outerjoin(CustomerPurchaseSummary, CustomerPurchaseSummary.customer_id == Customer.id).filter(Customer.company_id == user.company_id, Customer.is_deleted == 0)
        if filters.get("customer_id"):
            query = query.filter(Customer.id == filters["customer_id"])
        if filters.get("sales_status"):
            query = query.filter(Customer.status == filters["sales_status"])
        ordering = {"name": Customer.full_name, "orders": CustomerPurchaseSummary.total_orders, "spend": CustomerPurchaseSummary.total_revenue}.get(sort_by, Customer.full_name)
        total = query.count()
        records = query.order_by(ordering.asc() if sort_direction == "asc" else ordering.desc()).offset((page - 1) * page_size).limit(page_size).all()
        rows = [{"customer": customer.full_name, "email": customer.email, "phone": customer.phone, "segment": customer.segment, "status": customer.status, "total_orders": summary.total_orders if summary else 0, "total_spend": summary.total_revenue if summary else 0} for customer, summary in records]
        columns = [{"key": key, "label": label} for key, label in [("customer", "Customer"), ("email", "Email"), ("phone", "Phone"), ("segment", "Segment"), ("status", "Status"), ("total_orders", "Orders"), ("total_spend", "Total Spend")]]

    elif report_type == "product_performance":
        query = db.query(Product.name.label("product"), Product.sku, Product.brand, func.coalesce(func.sum(SaleItem.quantity), 0).label("units_sold"), func.coalesce(func.sum(SaleItem.total), 0).label("revenue")).join(SaleItem, SaleItem.product_id == Product.id).join(Sale, Sale.id == SaleItem.sale_id).filter(Sale.company_id == user.company_id)
        if filters.get("date_from"):
            query = query.filter(Sale.sale_date >= filters["date_from"])
        if filters.get("date_to"):
            query = query.filter(Sale.sale_date <= filters["date_to"])
        if filters.get("product_id"):
            query = query.filter(Product.id == filters["product_id"])
        if filters.get("category_id"):
            query = query.filter(SaleItem.category_id == filters["category_id"])
        if filters.get("brand"):
            query = query.filter(Product.brand.ilike(f"%{filters['brand']}%"))
        query = query.group_by(Product.id, Product.name, Product.sku, Product.brand)
        ordering = {"revenue": func.sum(SaleItem.total), "units": func.sum(SaleItem.quantity), "product": Product.name}.get(sort_by, func.sum(SaleItem.total))
        total = query.count()
        records = query.order_by(ordering.asc() if sort_direction == "asc" else ordering.desc()).offset((page - 1) * page_size).limit(page_size).all()
        rows = [{"product": item.product, "sku": item.sku, "brand": item.brand, "units_sold": item.units_sold, "revenue": item.revenue} for item in records]
        columns = [{"key": key, "label": label} for key, label in [("product", "Product"), ("sku", "SKU"), ("brand", "Brand"), ("units_sold", "Units Sold"), ("revenue", "Revenue")]]

    else:  # stock_movement
        query = db.query(InventoryMovement, Product).join(Inventory, Inventory.id == InventoryMovement.inventory_id).join(Product, Product.id == Inventory.product_id).filter(Inventory.company_id == user.company_id)
        if filters.get("date_from"):
            query = query.filter(InventoryMovement.created_at >= filters["date_from"])
        if filters.get("date_to"):
            query = query.filter(InventoryMovement.created_at <= filters["date_to"])
        if filters.get("product_id"):
            query = query.filter(Product.id == filters["product_id"])
        if filters.get("category_id"):
            query = query.filter(Product.category_id == filters["category_id"])
        if filters.get("brand"):
            query = query.filter(Product.brand.ilike(f"%{filters['brand']}%"))
        ordering = {"date": InventoryMovement.created_at, "quantity": InventoryMovement.quantity_changed, "product": Product.name}.get(sort_by, InventoryMovement.created_at)
        total = query.count()
        records = query.order_by(ordering.asc() if sort_direction == "asc" else ordering.desc()).offset((page - 1) * page_size).limit(page_size).all()
        rows = [{"date": movement.created_at, "product": product.name, "sku": product.sku, "movement_type": movement.movement_type, "quantity_changed": movement.quantity_changed, "previous_quantity": movement.previous_quantity, "updated_quantity": movement.updated_quantity, "reason": movement.reason} for movement, product in records]
        columns = [{"key": key, "label": label} for key, label in [("date", "Date"), ("product", "Product"), ("sku", "SKU"), ("movement_type", "Movement"), ("quantity_changed", "Change"), ("previous_quantity", "Previous"), ("updated_quantity", "Updated"), ("reason", "Reason")]]

    db.add(ReportHistory(company_id=user.company_id, generated_by=user.id, report_type=report_type, report_name=REPORT_TYPES[report_type], filters=_filters_for_history(filters), export_format="VIEW", status="COMPLETED"))
    db.commit()
    return _report_response(columns, rows, total, page, page_size, report_type, filters)
