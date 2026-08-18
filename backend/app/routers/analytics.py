from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.analytics_service import (
    audit_dashboard,
    category_details,
    dashboard,
    product_analytics,
    product_details,
    sales_business_intelligence,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])
role = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")


@router.get("/sales")
def sales_analytics(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    customer_id: int | None = None,
    brand: str | None = None,
    payment_method: str | None = None,
    interval: str = "daily",
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    if interval not in {"daily", "weekly", "monthly"}:
        raise HTTPException(status_code=422, detail="Interval must be daily, weekly, or monthly")
    if from_date and to_date and from_date > to_date:
        raise HTTPException(status_code=422, detail="From date cannot be after to date")
    return sales_business_intelligence(db, current_user, locals(), interval)


@router.get("/dashboard")
def get_dashboard(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    brand: str | None = None,
    channel: str | None = None,
    payment_method: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    filters = locals().copy()
    result = dashboard(db, current_user, filters)
    audit_dashboard(
        db,
        current_user,
        (
            "Dashboard Viewed"
            if not any(
                filters[key]
                for key in [
                    "from_date",
                    "to_date",
                    "product_id",
                    "category_id",
                    "brand",
                    "channel",
                    "payment_method",
                ]
            )
            else "Dashboard Filters Applied"
        ),
    )
    return result


@router.post("/dashboard/export")
def export_dashboard(db: Session = Depends(get_db), current_user=Depends(role)):
    audit_dashboard(db, current_user, "Report Exported: CSV/PDF")
    return {"message": "Export event recorded"}


@router.get("/export/pdf")
def export_dashboard_pdf(
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    """Generate a company-scoped analytics PDF report."""
    from app.utils.pdf import build_pdf

    result = dashboard(db, current_user, {})
    output = build_pdf(
        "RetailPulse Analytics Report",
        ["KPI", "Value"],
        [[name.replace("_", " ").title(), value] for name, value in result["kpis"].items()],
    )
    audit_dashboard(db, current_user, "Report Exported: PDF")
    return Response(
        content=output.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=analytics-report.pdf"},
    )


@router.get("/products")
def get_products(
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    return product_analytics(db, current_user)


@router.get("/products/{product_id}")
def get_product_details(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    return product_details(db, current_user, product_id)


@router.get("/categories/{category_id}")
def get_category_details(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    return category_details(db, current_user, category_id)
