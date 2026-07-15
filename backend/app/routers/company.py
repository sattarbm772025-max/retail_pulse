from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_role
)

from app.schemas.company import CompanyUpdate

from app.services.company_service import (
    get_company,
    update_company
)

router = APIRouter(
    prefix="/company",
    tags=["Company"]
)


@router.get("/")
def company(
    current_user=Depends(get_current_user)
):
    return get_company(current_user)


@router.put("/")
def update(

    request: CompanyUpdate,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_role(
            "SUPER_ADMIN",
            "COMPANY_ADMIN"
        )
    )
):
    return update_company(
        db,
        current_user,
        request
    )