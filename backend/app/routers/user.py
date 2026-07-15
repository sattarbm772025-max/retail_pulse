from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_role
)

from app.schemas.user import UserCreate

from app.services.user_service import (
    get_users,
    create_user
)

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.get("/")
def users(

    db: Session = Depends(get_db),

    current_user=Depends(get_current_user)
):
    return get_users(
        db,
        current_user
    )


@router.post("/")
def create(

    request: UserCreate,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_role(
            "SUPER_ADMIN",
            "COMPANY_ADMIN"
        )
    )
):
    return create_user(
        db,
        current_user,
        request
    )