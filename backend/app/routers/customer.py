import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.schemas.customer import CustomerPayload
from app.services.customer_service import (
    create_customer,
    customer_detail,
    customer_summary,
    change_customer_status,
    list_customers,
    update_customer,
)

router = APIRouter(prefix="/customers", tags=["Customers"])
viewer = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")
admin = require_role("SUPER_ADMIN", "COMPANY_ADMIN")


@router.get("/")
def list_all(
    search: str | None = None,
    customer_type: str | None = None,
    status: str | None = None,
    segment: str | None = None,
    city: str | None = None,
    sort: str = "name",
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(viewer),
):
    return list_customers(
        db,
        current_user,
        search,
        customer_type,
        status,
        segment,
        city,
        sort,
        page,
        page_size,
    )


@router.post("/")
def create(
    payload: CustomerPayload, db: Session = Depends(get_db), current_user=Depends(admin)
):
    return create_customer(db, current_user, payload)


@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    current_user=Depends(viewer),
):
    return customer_summary(db, current_user)


@router.get("/{customer_id}")
def detail(
    customer_id: int, db: Session = Depends(get_db), current_user=Depends(viewer)
):
    return customer_detail(db, current_user, customer_id)


@router.put("/{customer_id}")
def update(
    customer_id: int,
    payload: CustomerPayload,
    db: Session = Depends(get_db),
    current_user=Depends(admin),
):
    return update_customer(db, current_user, customer_id, payload)


@router.patch("/{customer_id}/activate")
def activate(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(admin),
):
    return change_customer_status(db, current_user, customer_id, "ACTIVE", "ACTIVATED")


@router.patch("/{customer_id}/deactivate")
def deactivate(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(admin),
):
    return change_customer_status(db, current_user, customer_id, "INACTIVE", "DEACTIVATED")


@router.delete("/{customer_id}")
def delete(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(admin),
):
    # Soft delete: retain the customer and historical transactions, but deactivate it.
    return change_customer_status(db, current_user, customer_id, "INACTIVE", "DELETED")


@router.get("/export/csv")
def export_customer_csv(
    db: Session = Depends(get_db),
    current_user=Depends(viewer),
):
    customers = list_customers(db, current_user, page_size=100)["items"]

    output = io.StringIO()

    writer = csv.writer(output)

    writer.writerow(
        [
            "Customer",
            "Email",
            "Phone",
            "Orders",
            "Total Spent",
            "Status",
        ]
    )

    for customer in customers:
        writer.writerow(
            [
                customer["full_name"],
                customer["email"],
                customer["phone"],
                customer["total_orders"],
                customer["total_revenue"],
                customer["status"],
            ]
        )

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=customers.csv"},
    )


@router.get("/export/pdf")
def export_customer_pdf(
    db: Session = Depends(get_db),
    current_user=Depends(viewer),
):
    from app.utils.pdf import build_pdf

    customers = list_customers(db, current_user, page_size=100)["items"]
    buffer = build_pdf(
        "RetailPulse Customer Report",
        ["Customer", "Email", "Orders", "Spent", "Status"],
        [
            [
                customer["full_name"],
                customer["email"],
                customer["total_orders"],
                f"{customer['total_revenue']:.2f}",
                customer["status"],
            ]
            for customer in customers
        ],
    )

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=customers.pdf"},
    )
