"""Inventory forecasting and smart replenishment calculations.

The engine intentionally runs on the backend.  It uses the last 30 calendar
days of sale items, including days with zero sales, to produce a stable average
daily demand for every active product in the current company.
"""

from collections import defaultdict
from datetime import date, timedelta
from math import ceil

from fastapi import HTTPException
from sqlalchemy import Float, and_, case, cast, func
from sqlalchemy.orm import Session, joinedload

from app.models.category import Category
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.sale import Sale, SaleItem

HISTORY_DAYS = 30
DEFAULT_FORECAST_DAYS = 30


def _validate_period(forecast_days: int) -> int:
    if not 1 <= forecast_days <= 365:
        raise HTTPException(
            status_code=422,
            detail="forecast_days must be between 1 and 365",
        )
    return forecast_days


def _daily_demand(db: Session, company_id: int, start_date: date, end_date: date):
    """Return product quantities by date from company-scoped historical sales."""
    rows = (
        db.query(
            SaleItem.product_id,
            func.date(Sale.sale_date).label("sale_day"),
            func.coalesce(func.sum(SaleItem.quantity), 0).label("quantity"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(
            Sale.company_id == company_id,
            Sale.sale_date >= start_date,
            Sale.sale_date < end_date + timedelta(days=1),
        )
        .group_by(SaleItem.product_id, func.date(Sale.sale_date))
        .all()
    )
    result: dict[int, dict[str, int]] = defaultdict(dict)
    for row in rows:
        result[row.product_id][str(row.sale_day)] = int(row.quantity or 0)
    return result


def _risk(
    current_stock: int,
    average_daily_sales: float,
    reorder_point: int,
    lead_time_days: int,
) -> str:
    if current_stock <= 0:
        return "OUT_OF_STOCK"
    if average_daily_sales <= 0:
        return "OVERSTOCK" if current_stock > max(reorder_point * 3, 1) else "HEALTHY"
    days_remaining = current_stock / average_daily_sales
    if days_remaining <= lead_time_days:
        return "STOCKOUT_RISK"
    if current_stock <= reorder_point:
        return "LOW_STOCK"
    if current_stock > reorder_point * 3:
        return "OVERSTOCK"
    return "HEALTHY"


def _recommendation(risk: str, reorder_quantity: int) -> str:
    messages = {
        "OUT_OF_STOCK": "Immediate restock required",
        "STOCKOUT_RISK": "Reorder soon to avoid a stockout",
        "LOW_STOCK": "Reorder required",
        "OVERSTOCK": "Review purchase plan; excess stock detected",
        "HEALTHY": "Stock level is healthy",
    }
    if reorder_quantity == 0 and risk in {"LOW_STOCK", "STOCKOUT_RISK"}:
        return "Monitor stock closely"
    return messages[risk]


def _build_recommendation(inventory: Inventory, daily_demand: dict[str, int], forecast_days: int):
    """Apply the documented replenishment formula to one product.

    safety stock = max(existing reorder level, average daily demand × product safety-stock days)
    reorder point = average daily demand × product lead time + safety stock
    target stock = forecast demand + lead-time demand + safety stock
    reorder quantity = max(target stock - current stock, 0)
    """
    product = inventory.product
    total_sales = sum(daily_demand.values())
    average_daily_sales = total_sales / HISTORY_DAYS
    forecasted_demand = ceil(average_daily_sales * forecast_days)
    lead_time_days = max(int(product.lead_time_days or 0), 0)
    safety_stock_days = max(int(product.safety_stock_days or 0), 0)
    safety_stock = max(inventory.reorder_level, ceil(average_daily_sales * safety_stock_days))
    reorder_point = ceil(average_daily_sales * lead_time_days + safety_stock)
    target_stock = ceil(average_daily_sales * (forecast_days + lead_time_days) + safety_stock)
    current_stock = max(int(inventory.available_stock or 0), 0)
    recommended_reorder_quantity = max(target_stock - current_stock, 0)
    risk = _risk(current_stock, average_daily_sales, reorder_point, lead_time_days)
    days_remaining = None if average_daily_sales <= 0 else round(current_stock / average_daily_sales, 1)

    return {
        "product_id": product.id,
        "inventory_id": inventory.id,
        "product": product.name,
        "sku": product.sku,
        "category_id": product.category_id,
        "category": product.category.name if product.category else "Uncategorised",
        "brand": product.brand,
        "supplier": product.supplier,
        "current_stock": current_stock,
        "average_daily_sales": round(average_daily_sales, 2),
        "forecasted_demand": forecasted_demand,
        "days_of_stock_remaining": days_remaining,
        "reorder_point": reorder_point,
        "safety_stock": safety_stock,
        "lead_time_days": lead_time_days,
        "safety_stock_days": safety_stock_days,
        "recommended_stock": target_stock,
        "recommended_reorder_quantity": recommended_reorder_quantity,
        "stock_risk": risk,
        "reorder_required": recommended_reorder_quantity > 0 and risk != "OVERSTOCK",
        "recommendation": _recommendation(risk, recommended_reorder_quantity),
        "historical_demand": daily_demand,
    }


def recommendations(
    db: Session,
    user,
    *,
    forecast_days: int = DEFAULT_FORECAST_DAYS,
    risk: str | None = None,
    category_id: int | None = None,
    supplier: str | None = None,
    product_id: int | None = None,
    reorder_required: bool | None = None,
    sort: str = "risk",
    page: int = 1,
    page_size: int = 10,
):
    forecast_days = _validate_period(forecast_days)
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(status_code=422, detail="Invalid pagination values")

    today = date.today()
    demand = (
        db.query(
            SaleItem.product_id.label("product_id"),
            func.coalesce(func.sum(SaleItem.quantity), 0).label("total_sales"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(
            Sale.company_id == user.company_id,
            Sale.sale_date >= today - timedelta(days=HISTORY_DAYS - 1),
            Sale.sale_date < today + timedelta(days=1),
        )
        .group_by(SaleItem.product_id)
        .subquery()
    )
    average_daily_sales = cast(func.coalesce(demand.c.total_sales, 0), Float) / HISTORY_DAYS
    safety_stock = func.greatest(
        Inventory.reorder_level,
        func.ceil(average_daily_sales * Product.safety_stock_days),
    )
    reorder_point = func.ceil(average_daily_sales * Product.lead_time_days + safety_stock)
    recommended_stock = func.ceil(
        average_daily_sales * (forecast_days + Product.lead_time_days) + safety_stock
    )
    reorder_quantity = func.greatest(recommended_stock - Inventory.available_stock, 0)
    days_remaining = case(
        (average_daily_sales > 0, cast(Inventory.available_stock, Float) / average_daily_sales),
        else_=None,
    )
    risk_level = case(
        (Inventory.available_stock <= 0, "OUT_OF_STOCK"),
        (and_(average_daily_sales > 0, days_remaining <= Product.lead_time_days), "STOCKOUT_RISK"),
        (Inventory.available_stock <= reorder_point, "LOW_STOCK"),
        (Inventory.available_stock > reorder_point * 3, "OVERSTOCK"),
        else_="HEALTHY",
    )
    reorder_needed = case(
        (and_(reorder_quantity > 0, risk_level != "OVERSTOCK"), True),
        else_=False,
    )
    query = (
        db.query(
            Product.id.label("product_id"),
            Inventory.id.label("inventory_id"),
            Product.name.label("product"),
            Product.sku,
            Product.category_id,
            Category.name.label("category"),
            Product.brand,
            Product.supplier,
            Inventory.available_stock.label("current_stock"),
            average_daily_sales.label("average_daily_sales"),
            func.ceil(average_daily_sales * forecast_days).label("forecasted_demand"),
            days_remaining.label("days_of_stock_remaining"),
            reorder_point.label("reorder_point"),
            safety_stock.label("safety_stock"),
            Product.lead_time_days,
            Product.safety_stock_days,
            recommended_stock.label("recommended_stock"),
            reorder_quantity.label("recommended_reorder_quantity"),
            risk_level.label("stock_risk"),
            reorder_needed.label("reorder_required"),
        )
        .join(Product, Product.id == Inventory.product_id)
        .join(Category, Category.id == Product.category_id)
        .outerjoin(demand, demand.c.product_id == Product.id)
        .filter(
            Inventory.company_id == user.company_id,
            Product.company_id == user.company_id,
            Product.status != "INACTIVE",
        )
    )
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if product_id:
        query = query.filter(Product.id == product_id)
    if supplier:
        query = query.filter(Product.supplier.ilike(f"%{supplier.strip()}%"))

    if risk:
        query = query.filter(risk_level == risk.upper())
    if reorder_required is not None:
        query = query.filter(reorder_needed.is_(reorder_required))

    risk_order = case(
        (risk_level == "OUT_OF_STOCK", 0),
        (risk_level == "STOCKOUT_RISK", 1),
        (risk_level == "LOW_STOCK", 2),
        (risk_level == "OVERSTOCK", 3),
        else_=4,
    )
    sorters = {
        "current_stock": Inventory.available_stock.asc(),
        "forecasted_demand": func.ceil(average_daily_sales * forecast_days).desc(),
        "days_remaining": days_remaining.asc().nullslast(),
        "recommended_quantity": reorder_quantity.desc(),
        "risk": risk_order.asc(),
    }
    if sort not in sorters:
        raise HTTPException(status_code=422, detail="Unsupported recommendation sort")
    filtered = query.subquery()
    totals = db.query(
        func.count().label("total"),
        func.coalesce(func.sum(case((filtered.c.reorder_required.is_(True), 1), else_=0)), 0).label("requiring_reorder"),
        func.coalesce(func.sum(case((filtered.c.stock_risk.in_(["OUT_OF_STOCK", "STOCKOUT_RISK"]), 1), else_=0)), 0).label("stockout_risk"),
        func.coalesce(func.sum(case((filtered.c.stock_risk == "OVERSTOCK", 1), else_=0)), 0).label("overstocked"),
        func.coalesce(func.sum(case((filtered.c.stock_risk == "HEALTHY", 1), else_=0)), 0).label("healthy"),
    ).one()
    rows = query.order_by(sorters[sort]).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [
            {
                "product_id": row.product_id,
                "inventory_id": row.inventory_id,
                "product": row.product,
                "sku": row.sku,
                "category_id": row.category_id,
                "category": row.category,
                "brand": row.brand,
                "supplier": row.supplier,
                "current_stock": int(row.current_stock or 0),
                "average_daily_sales": round(float(row.average_daily_sales or 0), 2),
                "forecasted_demand": int(row.forecasted_demand or 0),
                "days_of_stock_remaining": round(float(row.days_of_stock_remaining), 1) if row.days_of_stock_remaining is not None else None,
                "reorder_point": int(row.reorder_point or 0),
                "safety_stock": int(row.safety_stock or 0),
                "lead_time_days": row.lead_time_days,
                "safety_stock_days": row.safety_stock_days,
                "recommended_stock": int(row.recommended_stock or 0),
                "recommended_reorder_quantity": int(row.recommended_reorder_quantity or 0),
                "stock_risk": row.stock_risk,
                "reorder_required": bool(row.reorder_required),
                "recommendation": _recommendation(row.stock_risk, int(row.recommended_reorder_quantity or 0)),
            }
            for row in rows
        ],
        "page": page,
        "page_size": page_size,
        "total": totals.total,
        "total_pages": max(1, ceil(totals.total / page_size)),
        "summary": {
            "requiring_reorder": int(totals.requiring_reorder),
            "stockout_risk": int(totals.stockout_risk),
            "overstocked": int(totals.overstocked),
            "healthy": int(totals.healthy),
        },
        "formula": "Per product: safety stock = max(reorder level, average daily sales × safety-stock days); reorder point = average daily sales × lead-time days + safety stock.",
    }


def recommendation_detail(db: Session, user, product_id: int, forecast_days: int = DEFAULT_FORECAST_DAYS):
    result = recommendations(
        db,
        user,
        product_id=product_id,
        forecast_days=forecast_days,
        page_size=1,
    )
    if not result["items"]:
        raise HTTPException(status_code=404, detail="Active inventory product not found")
    today = date.today()
    history = _daily_demand(db, user.company_id, today - timedelta(days=HISTORY_DAYS - 1), today).get(product_id, {})
    item = _build_recommendation(
        db.query(Inventory).filter(Inventory.product_id == product_id, Inventory.company_id == user.company_id).options(joinedload(Inventory.product).joinedload(Product.category)).one(),
        history,
        _validate_period(forecast_days),
    )
    item["demand_history"] = [
        {"date": str(today - timedelta(days=offset)), "demand": history.get(str(today - timedelta(days=offset)), 0)}
        for offset in range(HISTORY_DAYS - 1, -1, -1)
    ]
    item["stock_comparison"] = {
        "current_stock": item["current_stock"],
        "recommended_stock": item["recommended_stock"],
        "average_daily_sales": item["average_daily_sales"],
        "reorder_point": item["reorder_point"],
        "safety_stock": item["safety_stock"],
    }
    item.pop("historical_demand", None)
    return item
