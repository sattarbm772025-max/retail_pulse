from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_role
)

from app.schemas.sale import (
    SaleCreate,
    SaleUpdate
)

from app.services.sale_service import (
    create_sale,
    delete_sale,
    get_sale,
    get_sales,
    summary,
    update_sale
)


router = APIRouter(
    prefix="/sales",
    tags=["Sales"]
)


sales_role = require_role(
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
    "ANALYST"
)


# Create Sale
@router.post("/")
def create(
    request: SaleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(sales_role)
):
    return create_sale(
        db,
        current_user,
        request
    )


# Sales Summary Dashboard
@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return summary(
        db,
        current_user
    )


# Get Sales List
@router.get("/")
def all_sales(
    search: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    category_id: int | None = None,
    sales_channel: str | None = None,
    payment_method: str | None = None,
    sort: str = "date",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_sales(
        db,
        current_user,
        search,
        date_from,
        date_to,
        category_id,
        sales_channel,
        payment_method,
        sort
    )


# Get Single Sale
@router.get("/{sale_id}")
def detail(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_sale(
        db,
        current_user,
        sale_id
    )


# Update Sale
@router.put("/{sale_id}")
def update(
    sale_id: int,
    request: SaleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(sales_role)
):
    return update_sale(
        db,
        current_user,
        sale_id,
        request
    )


# Delete Sale
@router.delete("/{sale_id}")
def delete(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(sales_role)
):
    return delete_sale(
        db,
        current_user,
        sale_id
    )