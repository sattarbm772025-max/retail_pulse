from datetime import date, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func

from app.models.forecast import DemandForecast, ForecastHistory
from app.models.inventory import Inventory
from app.models.notification import Notification
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.services.audit_service import create_audit_log

HISTORY_DAYS = 30


def _calculate_accuracy(prediction: float, actual: float) -> float:
    """
    Calculate actual forecast accuracy.

    Accuracy is based on the difference between
    predicted demand and actual demand.

    Example:
        prediction = 100
        actual = 90
        accuracy = 90%
    """

    if prediction <= 0:
        return 100.0 if actual <= 0 else 0.0

    error = abs(prediction - actual) / prediction

    accuracy = max(
        0.0,
        min(
            100.0,
            (1 - error) * 100,
        ),
    )

    return round(accuracy, 2)


def _calculate_confidence(
    daily_values: list[float],
    active_days: int,
) -> float:
    """
    Estimate model confidence separately from actual accuracy.

    Confidence depends on:
    - amount of historical data
    - number of days containing sales
    - stability of daily demand
    """

    if not daily_values:
        return 0.0

    total_days = len(daily_values)

    coverage = min(
        active_days / max(total_days, 1),
        1.0,
    )

    average = sum(daily_values) / total_days

    if average <= 0:
        stability = 0.0
    else:
        variance = sum((value - average) ** 2 for value in daily_values) / total_days

        standard_deviation = variance**0.5

        coefficient_of_variation = standard_deviation / average

        stability = max(
            0.0,
            min(
                1.0,
                1.0 - coefficient_of_variation,
            ),
        )

    confidence = ((coverage * 0.6) + (stability * 0.4)) * 100

    return round(
        max(
            0.0,
            min(
                100.0,
                confidence,
            ),
        ),
        2,
    )


def _get_daily_sales(
    db,
    user,
    product_id: int,
    start_date: date,
    end_date: date,
):
    """
    Return daily sales for one product.

    Days without sales are included as zero.
    """

    rows = (
        db.query(
            func.date(Sale.sale_date).label("sale_day"),
            func.coalesce(
                func.sum(SaleItem.quantity),
                0,
            ).label("quantity"),
        )
        .join(
            SaleItem,
            SaleItem.sale_id == Sale.id,
        )
        .filter(
            Sale.company_id == user.company_id,
            SaleItem.product_id == product_id,
            Sale.sale_date >= start_date,
            Sale.sale_date <= end_date,
        )
        .group_by(
            func.date(Sale.sale_date),
        )
        .order_by(
            func.date(Sale.sale_date),
        )
        .all()
    )

    sales_by_day = {row.sale_day: float(row.quantity or 0) for row in rows}

    daily_values = []

    current = start_date

    while current <= end_date:
        value = sales_by_day.get(
            current,
            0.0,
        )

        daily_values.append(value)

        current += timedelta(days=1)

    return daily_values


def generate_forecasts(
    db,
    user,
    period: int,
):
    """
    Generate demand forecasts using actual historical dates.

    Historical window:
        Last 30 days.

    Forecast:
        Average daily demand from the historical
        window multiplied by the requested period.

    Confidence:
        Based on historical data coverage and stability.

    Accuracy:
        NOT generated here from confidence.

        Accuracy is calculated later when actual sales
        for the forecast period become available.
    """

    if period not in {
        7,
        30,
        90,
    }:
        raise HTTPException(
            status_code=422,
            detail="Period must be 7, 30, or 90 days",
        )

    products = (
        db.query(Product)
        .filter(
            Product.company_id == user.company_id,
            Product.status == "ACTIVE",
        )
        .all()
    )

    if not products:
        raise HTTPException(
            status_code=422,
            detail=("No active products are available " "for forecasting"),
        )

    end_date = date.today()

    start_date = end_date - timedelta(days=HISTORY_DAYS - 1)

    created = []

    for product in products:

        daily_sales = _get_daily_sales(
            db,
            user,
            product.id,
            start_date,
            end_date,
        )

        total_historical_sales = sum(daily_sales)

        if total_historical_sales <= 0:
            continue

        active_days = sum(1 for value in daily_sales if value > 0)

        daily_average = total_historical_sales / HISTORY_DAYS

        prediction = round(
            daily_average * period,
            2,
        )

        confidence = _calculate_confidence(
            daily_sales,
            active_days,
        )

        forecast = (
            db.query(DemandForecast)
            .filter(
                DemandForecast.company_id == user.company_id,
                DemandForecast.product_id == product.id,
                DemandForecast.forecast_period == period,
            )
            .first()
        )

        if forecast:

            forecast.predicted_demand = prediction

            forecast.confidence_score = confidence

            forecast.generated_at = datetime.utcnow()

        else:

            forecast = DemandForecast(
                company_id=user.company_id,
                product_id=product.id,
                category_id=product.category_id,
                forecast_period=period,
                predicted_demand=prediction,
                confidence_score=confidence,
            )

            db.add(forecast)

            db.flush()

        history = ForecastHistory(
            forecast_id=forecast.id,
            historical_sales=total_historical_sales,
            prediction=prediction,
            actual_sales=None,
            accuracy=None,
        )

        db.add(history)

        inventory = (
            db.query(Inventory)
            .filter(
                Inventory.company_id == user.company_id,
                Inventory.product_id == product.id,
            )
            .first()
        )

        if inventory and prediction > inventory.available_stock:
            db.add(
                Notification(
                    company_id=user.company_id,
                    product_id=product.id,
                    level="FORECAST",
                    message=(
                        f"Forecast recommends "
                        f"restocking {product.name}: "
                        f"predicted demand "
                        f"{prediction}, "
                        f"available "
                        f"{inventory.available_stock}."
                    ),
                )
            )

        created.append(forecast)

    if not created:
        raise HTTPException(
            status_code=422,
            detail=("Forecasting requires " "historical sales data"),
        )

    create_audit_log(
        db,
        user.company_id,
        user.id,
        f"Forecast Generated: {period} days",
        commit=False,
        entity_type="FORECAST",
    )

    db.commit()

    return {
        "message": "Forecasts generated",
        "count": len(created),
        "historical_days": HISTORY_DAYS,
        "historical_start": start_date,
        "historical_end": end_date,
    }


def update_forecast_accuracy(
    db,
    user,
    forecast_id: int,
):
    """
    Calculate actual forecast accuracy after the
    forecast period has elapsed.
    """

    forecast = (
        db.query(DemandForecast)
        .filter(
            DemandForecast.id == forecast_id,
            DemandForecast.company_id == user.company_id,
        )
        .first()
    )

    if not forecast:
        raise HTTPException(
            status_code=404,
            detail="Forecast not found",
        )

    history = (
        db.query(ForecastHistory)
        .filter(
            ForecastHistory.forecast_id == forecast.id,
            ForecastHistory.actual_sales.is_(None),
        )
        .order_by(ForecastHistory.created_at.desc())
        .first()
    )

    if not history:
        raise HTTPException(
            status_code=404,
            detail="No pending forecast history found",
        )

    generated_date = forecast.generated_at.date()

    actual_start = generated_date + timedelta(days=1)

    actual_end = actual_start + timedelta(days=forecast.forecast_period - 1)

    actual_sales = (
        db.query(
            func.coalesce(
                func.sum(SaleItem.quantity),
                0,
            )
        )
        .join(
            Sale,
            Sale.id == SaleItem.sale_id,
        )
        .filter(
            Sale.company_id == user.company_id,
            SaleItem.product_id == forecast.product_id,
            Sale.sale_date >= actual_start,
            Sale.sale_date <= actual_end,
        )
        .scalar()
    )

    actual_sales = float(actual_sales or 0)

    history.actual_sales = actual_sales

    history.accuracy = _calculate_accuracy(
        history.prediction,
        actual_sales,
    )

    db.commit()

    return {
        "forecast_id": forecast.id,
        "predicted_demand": history.prediction,
        "actual_sales": actual_sales,
        "accuracy": history.accuracy,
    }


def list_forecasts(
    db,
    user,
    period: int,
    category_id=None,
    brand=None,
    sort="demand",
):
    query = (
        db.query(
            DemandForecast,
            Product,
            Inventory,
        )
        .join(
            Product,
            Product.id == DemandForecast.product_id,
        )
        .outerjoin(
            Inventory,
            Inventory.product_id == Product.id,
        )
        .filter(
            DemandForecast.company_id == user.company_id,
            DemandForecast.forecast_period == period,
        )
    )

    if category_id:
        query = query.filter(DemandForecast.category_id == category_id)

    if brand:
        query = query.filter(Product.brand.ilike(f"%{brand}%"))

    order = (
        DemandForecast.predicted_demand.desc()
        if sort == "demand"
        else Inventory.available_stock.asc()
    )

    rows = query.order_by(order).all()

    results = []

    for forecast, product, inventory in rows:

        history = (
            db.query(ForecastHistory)
            .filter(
                ForecastHistory.forecast_id == forecast.id,
            )
            .order_by(ForecastHistory.created_at.desc())
            .first()
        )

        results.append(
            {
                "id": forecast.id,
                "product": product.name,
                "category_id": forecast.category_id,
                "current_stock": (inventory.available_stock if inventory else 0),
                "historical_sales": (history.historical_sales if history else 0),
                "predicted_demand": (forecast.predicted_demand),
                "confidence": (forecast.confidence_score),
                "actual_sales": (history.actual_sales if history else None),
                "accuracy": (history.accuracy if history else None),
                "recommendation": (
                    "IMMEDIATE_RESTOCK"
                    if (
                        inventory
                        and forecast.predicted_demand > inventory.available_stock
                    )
                    else "STOCK_LEVEL_HEALTHY"
                ),
            }
        )

    return results
