from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from app.models.user import User

from app.schemas.auth import (
    CompanyRegister,
    LoginRequest,
    RefreshRequest,
    PasswordChangeRequest,
    ForgotPasswordRequest,
)

from app.services.auth_service import (
    register_company,
    login_user,
    logout_user,
    refresh_access_token,
    get_profile,
    change_password,
    request_password_reset,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)



# -------------------------
# Helper Functions
# -------------------------

def request_metadata(request: Request) -> tuple[str, str]:
    """
    Extract client information for audit logging.
    """

    ip_address = (
        request.client.host
        if request.client
        else "Unknown"
    )

    browser = request.headers.get(
        "user-agent",
        "Unknown",
    )

    return ip_address, browser



# -------------------------
# Company Registration
# -------------------------

@router.post("/register")
def register(
    payload: CompanyRegister,
    db: Session = Depends(get_db),
):
    """
    Register company and create first admin user.
    """

    return register_company(
        payload,
        db,
    )



# -------------------------
# Login
# -------------------------

@router.post("/login")
def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and generate JWT tokens.
    """

    ip_address, browser = request_metadata(
        request
    )

    return login_user(
        credentials.email,
        credentials.password,
        db,
        ip_address,
        browser,
    )



# -------------------------
# Logout
# -------------------------

@router.post("/logout")
def logout(
    payload: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Logout user and invalidate refresh token.
    """

    ip_address, browser = request_metadata(
        request
    )

    return logout_user(
        payload.refresh_token,
        db,
        current_user,
        ip_address,
        browser,
    )



# -------------------------
# Refresh Access Token
# -------------------------

@router.post("/refresh")
def refresh_token(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
):
    """
    Generate new access token using refresh token.
    """

    return refresh_access_token(
        payload.refresh_token,
        db,
    )



# -------------------------
# Current User Profile
# -------------------------

@router.get("/me")
def profile(
    current_user: User = Depends(get_current_user),
):
    """
    Return logged-in user profile.
    """

    return get_profile(
        current_user
    )



# -------------------------
# Change Password
# -------------------------

@router.post("/change-password")
def update_password(
    payload: PasswordChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Change current user's password.
    """

    ip_address, browser = request_metadata(
        request
    )

    return change_password(
        current_user,
        payload.current_password,
        payload.new_password,
        db,
        ip_address,
        browser,
    )



# -------------------------
# Forgot Password
# -------------------------

@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Request password reset.
    """

    return request_password_reset(
        payload.email,
        db,
    )