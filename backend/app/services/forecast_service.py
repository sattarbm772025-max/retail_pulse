from sqlalchemy import func
from fastapi import HTTPException
from app.models.forecast import DemandForecast, ForecastHistory
from app.models.inventory import Inventory
from app.models.notification import Notification
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.services.audit_service import create_audit_log


def generate_forecasts(db, user, period: int):
    products = db.query(Product).filter(Product.company_id == user.company_id, Product.status == "ACTIVE").all()
    if not products:
        raise HTTPException(status_code=422, detail="No active products are available for forecasting")
    created = []
    for product in products:
        historical = db.query(func.coalesce(func.sum(SaleItem.quantity), 0)).join(Sale).filter(Sale.company_id == user.company_id, SaleItem.product_id == product.id).scalar()
        if not historical:
            continue
        # Moving-average demand: historical daily demand projected to the requested period.
        daily_average = float(historical) / 30
        prediction = round(daily_average * period, 2)
        forecast = db.query(DemandForecast).filter(DemandForecast.company_id == user.company_id, DemandForecast.product_id == product.id, DemandForecast.forecast_period == period).first()
        if forecast:
            forecast.predicted_demand = prediction; forecast.confidence_score = 0.7
        else:
            forecast = DemandForecast(company_id=user.company_id, product_id=product.id, category_id=product.category_id, forecast_period=period, predicted_demand=prediction, confidence_score=0.7)
            db.add(forecast); db.flush()
        db.add(ForecastHistory(forecast_id=forecast.id, historical_sales=float(historical), prediction=prediction, accuracy=forecast.confidence_score * 100))
        inventory = db.query(Inventory).filter(Inventory.company_id == user.company_id, Inventory.product_id == product.id).first()
        if inventory and prediction > inventory.available_stock:
            db.add(Notification(company_id=user.company_id, product_id=product.id, level="FORECAST", message=f"Forecast recommends restocking {product.name}: predicted demand {prediction}, available {inventory.available_stock}."))
        created.append(forecast)
    if not created:
        raise HTTPException(status_code=422, detail="Forecasting requires historical sales data")
    create_audit_log(db, user.company_id, user.id, f"Forecast Generated: {period} days", commit=False, entity_type="FORECAST")
    db.commit(); return {"message": "Forecasts generated", "count": len(created)}


def list_forecasts(db, user, period: int, category_id=None, brand=None, sort="demand"):
    query = db.query(DemandForecast, Product, Inventory).join(Product, Product.id == DemandForecast.product_id).outerjoin(Inventory, Inventory.product_id == Product.id).filter(DemandForecast.company_id == user.company_id, DemandForecast.forecast_period == period)
    if category_id: query = query.filter(DemandForecast.category_id == category_id)
    if brand: query = query.filter(Product.brand.ilike(f"%{brand}%"))
    order = DemandForecast.predicted_demand.desc() if sort == "demand" else Inventory.available_stock.asc()
    rows = query.order_by(order).all()
    return [{"id": forecast.id, "product": product.name, "category_id": forecast.category_id, "current_stock": inventory.available_stock if inventory else 0, "historical_sales": history_value(db, forecast.id), "predicted_demand": forecast.predicted_demand, "confidence": forecast.confidence_score, "recommendation": "IMMEDIATE_RESTOCK" if (inventory and forecast.predicted_demand > inventory.available_stock) else "STOCK_LEVEL_HEALTHY"} for forecast, product, inventory in rows]


def history_value(db, forecast_id):
    row = db.query(ForecastHistory).filter(ForecastHistory.forecast_id == forecast_id).order_by(ForecastHistory.created_at.desc()).first()
    return row.historical_sales if row else 0
