from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role

from app.schemas.inventory import InventoryCreate
from app.services.inventory_service import (
    create_inventory,
    get_inventory
)

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)


@router.post("/")
def create(
    request: InventoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("SUPER_ADMIN", "COMPANY_ADMIN"))
):
    return create_inventory(db, current_user, request)


@router.get("/")
def all_inventory(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_inventory(db, current_user)