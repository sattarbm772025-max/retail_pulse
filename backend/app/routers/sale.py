import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.schemas.sale import SaleCreate, SaleUpdate
from app.services.sale_service import (
    create_sale,
    delete_sale,
    get_sale,
    get_sales,
    summary,
    update_sale,
)


router = APIRouter(prefix="/sales", tags=["Sales"])
role = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")


@router.post("/")
def create(request: SaleCreate, db: Session = Depends(get_db), current_user=Depends(role)):
    return create_sale(db, current_user, request)


@router.get("/summary")
def get_summary(db: Session = Depends(get_db), current_user=Depends(role)):
    return summary(db, current_user)


@router.get("/")
def all_sales(
    search: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    category_id: int | None = None,
    sales_channel: str | None = None,
    payment_method: str | None = None,
    payment_status: str | None = None,
    sort: str = "date",
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    return get_sales(
        db, current_user, search, date_from, date_to, category_id,
        sales_channel, payment_method, sort, payment_status,
    )


@router.get("/export/csv")
def export_sales_csv(db: Session = Depends(get_db), current_user=Depends(role)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Invoice", "Customer", "Date", "Payment", "Status", "Amount"])
    for sale in get_sales(db, current_user):
        writer.writerow([
            sale["invoice_number"], sale["customer_name"], sale["sale_date"],
            sale["payment_method"], sale["payment_status"], sale["total_amount"],
        ])
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_report.csv"},
    )


@router.get("/export/pdf")
def export_sales_pdf(db: Session = Depends(get_db), current_user=Depends(role)):
    from app.utils.pdf import build_pdf

    rows = [
        [
            sale["invoice_number"], sale["customer_name"], str(sale["sale_date"]),
            sale["payment_method"], sale["payment_status"], f"{sale['total_amount']:.2f}",
        ]
        for sale in get_sales(db, current_user)
    ]
    return StreamingResponse(
        build_pdf("RetailPulse Sales Report", ["Invoice", "Customer", "Date", "Method", "Status", "Amount"], rows),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=sales_report.pdf"},
    )


@router.get("/{sale_id}")
def detail(sale_id: int, db: Session = Depends(get_db), current_user=Depends(role)):
    return get_sale(db, current_user, sale_id)


@router.put("/{sale_id}")
def update(sale_id: int, request: SaleUpdate, db: Session = Depends(get_db), current_user=Depends(role)):
    return update_sale(db, current_user, sale_id, request)


@router.delete("/{sale_id}")
def delete(sale_id: int, db: Session = Depends(get_db), current_user=Depends(role)):
    return delete_sale(db, current_user, sale_id)
