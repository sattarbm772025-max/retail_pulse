from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.forecast_service import generate_forecasts, list_forecasts
router = APIRouter(prefix="/forecasts", tags=["Forecasts"])
role = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")
@router.post("/generate")
def generate(period: int = 30, db: Session = Depends(get_db), current_user=Depends(role)):
    if period not in {7, 30, 90}: return {"detail": "Period must be 7, 30, or 90 days"}
    return generate_forecasts(db, current_user, period)
@router.get("/")
def list_all(period: int = 30, category_id: int | None = None, brand: str | None = None, sort: str = "demand", db: Session = Depends(get_db), current_user=Depends(role)):
    return list_forecasts(db, current_user, period, category_id, brand, sort)
