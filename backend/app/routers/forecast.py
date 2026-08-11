import csv
import io

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.forecast_service import generate_forecasts, list_forecasts

router = APIRouter(prefix="/forecasts", tags=["Forecasts"])
role = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")


@router.post("/generate")
def generate(
    period: int = 30, db: Session = Depends(get_db), current_user=Depends(role)
):
    if period not in {7, 30, 90}:
        raise HTTPException(status_code=422, detail="Period must be 7, 30, or 90 days")
    return generate_forecasts(db, current_user, period)


@router.get("/")
def list_all(
    period: int = 30,
    category_id: int | None = None,
    brand: str | None = None,
    sort: str = "demand",
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    return list_forecasts(db, current_user, period, category_id, brand, sort)


@router.get("/export/csv")
def export_csv(
    period: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    forecasts = list_forecasts(
        db,
        current_user,
        period,
    )

    output = io.StringIO()

    writer = csv.writer(output)

    writer.writerow(
        [
            "Product",
            "Current Stock",
            "Predicted Demand",
            "Confidence",
            "Recommendation",
        ]
    )

    for row in forecasts:
        writer.writerow(
            [
                row["product"],
                row["current_stock"],
                row["predicted_demand"],
                row["confidence"],
                row["recommendation"],
            ]
        )

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=forecast_report.csv"},
    )


@router.get("/export/pdf")
def export_pdf(
    period: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    forecasts = list_forecasts(
        db,
        current_user,
        period,
    )

    from app.utils.pdf import build_pdf

    buffer = build_pdf(
        "RetailPulse Demand Forecast",
        ["Product", "Stock", "Demand", "Confidence", "Recommendation"],
        [[item["product"], item["current_stock"], item["predicted_demand"], f'{item["confidence"]:.2f}', item["recommendation"]] for item in forecasts],
    )

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=forecast_report.pdf"},
    )
