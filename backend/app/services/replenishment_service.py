"""Inventory forecasting and smart replenishment calculations.

The engine intentionally runs on the backend.  It uses the last 30 calendar
days of sale items, including days with zero sales, to produce a stable average
daily demand for every active product in the current company.
"""

from collections import defaultdict
from datetime import date, timedelta
from math import ceil

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.inventory import Inventory
from app.models.product import Product
from app.models.sale import Sale, SaleItem

HISTORY_DAYS = 30
DEFAULT_FORECAST_DAYS = 30
LEAD_TIME_DAYS = 7
SAFETY_STOCK_DAYS = 3


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


def _risk(current_stock: int, average_daily_sales: float, reorder_point: int) -> str:
    if current_stock <= 0:
        return "OUT_OF_STOCK"
    if average_daily_sales <= 0:
        return "OVERSTOCK" if current_stock > max(reorder_point * 3, 1) else "HEALTHY"
    days_remaining = current_stock / average_daily_sales
    if days_remaining <= LEAD_TIME_DAYS:
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

    safety stock = max(existing reorder level, average daily demand × 3 days)
    reorder point = average daily demand × 7-day lead time + safety stock
    target stock = forecast demand + lead-time demand + safety stock
    reorder quantity = max(target stock - current stock, 0)
    """
    product = inventory.product
    total_sales = sum(daily_demand.values())
    average_daily_sales = total_sales / HISTORY_DAYS
    forecasted_demand = ceil(average_daily_sales * forecast_days)
    safety_stock = max(inventory.reorder_level, ceil(average_daily_sales * SAFETY_STOCK_DAYS))
    reorder_point = ceil(average_daily_sales * LEAD_TIME_DAYS + safety_stock)
    target_stock = ceil(average_daily_sales * (forecast_days + LEAD_TIME_DAYS) + safety_stock)
    current_stock = max(int(inventory.available_stock or 0), 0)
    recommended_reorder_quantity = max(target_stock - current_stock, 0)
    risk = _risk(current_stock, average_daily_sales, reorder_point)
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
    daily_demand = _daily_demand(
        db,
        user.company_id,
        today - timedelta(days=HISTORY_DAYS - 1),
        today,
    )
    query = (
        db.query(Inventory)
        .join(Product, Product.id == Inventory.product_id)
        .options(joinedload(Inventory.product).joinedload(Product.category))
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

    rows = [
        _build_recommendation(inventory, daily_demand.get(inventory.product_id, {}), forecast_days)
        for inventory in query.all()
    ]
    if risk:
        rows = [row for row in rows if row["stock_risk"] == risk.upper()]
    if reorder_required is not None:
        rows = [row for row in rows if row["reorder_required"] is reorder_required]

    sorters = {
        "current_stock": lambda row: row["current_stock"],
        "forecasted_demand": lambda row: row["forecasted_demand"],
        "days_remaining": lambda row: row["days_of_stock_remaining"] if row["days_of_stock_remaining"] is not None else float("inf"),
        "recommended_quantity": lambda row: row["recommended_reorder_quantity"],
        "risk": lambda row: {"OUT_OF_STOCK": 0, "STOCKOUT_RISK": 1, "LOW_STOCK": 2, "OVERSTOCK": 3, "HEALTHY": 4}[row["stock_risk"]],
    }
    if sort not in sorters:
        raise HTTPException(status_code=422, detail="Unsupported recommendation sort")
    rows.sort(key=sorters[sort], reverse=sort not in {"days_remaining", "risk", "current_stock"})
    total = len(rows)
    start = (page - 1) * page_size
    return {
        "items": [{key: value for key, value in row.items() if key != "historical_demand"} for row in rows[start : start + page_size]],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max(1, ceil(total / page_size)),
        "summary": {
            "requiring_reorder": sum(row["reorder_required"] for row in rows),
            "stockout_risk": sum(row["stock_risk"] in {"OUT_OF_STOCK", "STOCKOUT_RISK"} for row in rows),
            "overstocked": sum(row["stock_risk"] == "OVERSTOCK" for row in rows),
            "healthy": sum(row["stock_risk"] == "HEALTHY" for row in rows),
        },
        "formula": "Safety stock = max(reorder level, average daily sales × 3); reorder point = average daily sales × 7 + safety stock.",
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
