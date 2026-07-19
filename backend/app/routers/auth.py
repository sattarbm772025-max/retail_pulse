from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import CompanyRegister, LoginRequest, RefreshRequest, PasswordChangeRequest, ForgotPasswordRequest
from app.services.auth_service import (
    register_company,
    login_user,
    logout_user
)
from app.core.dependencies import get_current_user
from app.services.auth_service import (
    refresh_access_token,
    get_profile,
    change_password,
    request_password_reset,
)
from app.models.user import User


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)
@router.post("/register")
def register(
    request: CompanyRegister,
    db: Session = Depends(get_db)
):
    return register_company(request, db)
def request_metadata(request: Request) -> tuple[str, str]:
    return request.client.host if request.client else "Unknown", request.headers.get("user-agent", "Unknown")


@router.post("/login")
def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    ip_address, browser = request_metadata(request)
    return login_user(
        credentials.email,
        credentials.password,
        db,
        ip_address,
        browser,
    )
@router.post("/logout")
def logout(
    payload: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip_address, browser = request_metadata(request)
    return logout_user(
        payload.refresh_token, db, current_user, ip_address, browser
    )
@router.post("/refresh")
def refresh_token(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
):
    return refresh_access_token(
        payload.refresh_token,
        db
    )
@router.get("/me")
def me(
    current_user: User = Depends(get_current_user)
):
    return get_profile(current_user)


@router.post("/change-password")
def update_password(
    payload: PasswordChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip_address, browser = request_metadata(request)
    return change_password(current_user, payload.current_password, payload.new_password, db, ip_address, browser)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return request_password_reset(payload.email, db)
