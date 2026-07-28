from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.analytics_service import dashboard, audit_dashboard

router = APIRouter(prefix="/analytics", tags=["Analytics"])
role = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")

@router.get("/dashboard")
def get_dashboard(from_date: datetime | None = None, to_date: datetime | None = None, product_id: int | None = None, category_id: int | None = None, brand: str | None = None, channel: str | None = None, payment_method: str | None = None, db: Session = Depends(get_db), current_user=Depends(role)):
    filters = locals().copy()
    result = dashboard(db, current_user, filters)
    audit_dashboard(db, current_user, "Dashboard Viewed" if not any(filters[key] for key in ["from_date", "to_date", "product_id", "category_id", "brand", "channel", "payment_method"]) else "Dashboard Filters Applied")
    return result

@router.post("/dashboard/export")
def export_dashboard(db: Session = Depends(get_db), current_user=Depends(role)):
    audit_dashboard(db, current_user, "Report Exported: CSV/PDF")
    return {"message": "Export event recorded"}
