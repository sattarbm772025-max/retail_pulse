from fastapi import APIRouter, Depends

from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.auth_service import get_profile

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)


@router.get("/")
def profile(
    current_user: User = Depends(get_current_user)
):
    return get_profile(current_user)