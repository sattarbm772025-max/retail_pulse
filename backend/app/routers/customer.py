from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_role
from app.schemas.customer import CustomerPayload
from app.services.customer_service import create_customer, customer_detail, list_customers, update_customer

router = APIRouter(prefix="/customers", tags=["Customers"])
viewer = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")
admin = require_role("SUPER_ADMIN", "COMPANY_ADMIN")

@router.get("/")
def list_all(search: str | None = None, customer_type: str | None = None, status: str | None = None, city: str | None = None, sort: str = "name", page: int = 1, page_size: int = 10, db: Session = Depends(get_db), current_user=Depends(viewer)):
    return list_customers(db, current_user, search, customer_type, status, city, sort, page, page_size)

@router.post("/")
def create(payload: CustomerPayload, db: Session = Depends(get_db), current_user=Depends(admin)):
    return create_customer(db, current_user, payload)

@router.get("/{customer_id}")
def detail(customer_id: int, db: Session = Depends(get_db), current_user=Depends(viewer)):
    return customer_detail(db, current_user, customer_id)

@router.put("/{customer_id}")
def update(customer_id: int, payload: CustomerPayload, db: Session = Depends(get_db), current_user=Depends(admin)):
    return update_customer(db, current_user, customer_id, payload)
