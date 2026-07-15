from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role

from app.schemas.category import CategoryCreate
from app.services.category_service import (
    create_category,
    get_categories
)

router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)


@router.post("/")
def create(
    request: CategoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("SUPER_ADMIN", "COMPANY_ADMIN"))
):
    return create_category(db, current_user, request)


@router.get("/")
def all_categories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_categories(db, current_user)