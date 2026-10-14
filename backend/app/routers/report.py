"""Initial Task 15 report-generation API (Days 1–2)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.report_service import REPORT_TYPES, generate_report

router = APIRouter(prefix="/reports", tags=["Reports"])
report_viewer = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")


@router.get("/types")
def report_types(current_user=Depends(report_viewer)):
    """Return the supported, non-hardcoded report definitions for the UI."""
    return [{"id": key, "name": value} for key, value in REPORT_TYPES.items()]


@router.get("/generate")
def generate(
    report_type: str,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    customer_id: int | None = None,
    brand: str | None = None,
    sales_status: str | None = None,
    stock_status: str | None = None,
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "date",
    sort_direction: str = "desc",
    db: Session = Depends(get_db),
    current_user=Depends(report_viewer),
):
    """Generate a company-scoped, paginated report from operational tables."""
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from cannot be after date_to")
    return generate_report(
        db, current_user, report_type,
        {"date_from": date_from, "date_to": date_to, "product_id": product_id,
         "category_id": category_id, "customer_id": customer_id, "brand": brand,
         "sales_status": sales_status, "stock_status": stock_status},
        page, page_size, sort_by, sort_direction,
    )
