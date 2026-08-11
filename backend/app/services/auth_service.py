from datetime import datetime, timezone

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import ALGORITHM, SECRET_KEY
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.category import Category
from app.models.company import Company
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import CompanyRegister
from app.services.audit_service import create_audit_log
from app.services.email_service import send_reset_email


# ==============================
# Register Company
# ==============================

def register_company(request: CompanyRegister, db: Session):
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match",
        )

    company_exists = (
        db.query(Company)
        .filter(
            (Company.email == request.company_email)
            | (Company.name == request.company_name)
        )
        .first()
    )

    if company_exists:
        raise HTTPException(
            status_code=400,
            detail="Company name or email already exists",
        )

    user_exists = (
        db.query(User)
        .filter(User.email == request.owner_email)
        .first()
    )

    if user_exists:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    company = Company(
        name=request.company_name,
        industry=request.industry,
        email=request.company_email,
        address=request.company_address,
        phone=request.company_phone,
    )

    try:
        db.add(company)
        db.flush()

        admin = User(
            company_id=company.id,
            name=request.owner_name,
            email=request.owner_email,
            password=hash_password(request.password),
            role="COMPANY_ADMIN",
            status="ACTIVE",
        )

        db.add(admin)
        db.flush()

        default_categories = [
            "Mobile",
            "Laptop",
            "Accessories",
            "Clothing",
        ]

        for category in default_categories:
            db.add(
                Category(
                    company_id=company.id,
                    name=category,
                    description=f"Default {category} category",
                    status="ACTIVE",
                )
            )

        create_audit_log(
            db,
            company.id,
            admin.id,
            "Company Registered",
            commit=False,
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Company Registered Successfully",
    }


# ==============================
# Login User
# ==============================

def login_user(
    email: str,
    password: str,
    db: Session,
    ip_address: str = "Unknown",
    browser: str = "Unknown",
):
    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not verify_password(password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid Email or Password",
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail="Account inactive",
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "company": user.company_id,
            "role": user.role,
        }
    )

    refresh_token = create_refresh_token(
        {"sub": str(user.id)}
    )

    payload = jwt.get_unverified_claims(refresh_token)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=datetime.fromtimestamp(
                payload["exp"],
                tz=timezone.utc,
            ),
        )
    )

    user.last_login = datetime.now(timezone.utc)

    create_audit_log(
        db,
        user.company_id,
        user.id,
        "User Login",
        ip_address,
        browser,
        commit=False,
    )

    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# ==============================
# Logout User
# ==============================

def logout_user(
    refresh_token: str,
    db: Session,
    current_user: User,
    ip_address="Unknown",
    browser="Unknown",
):
    token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == hash_token(refresh_token),
            RefreshToken.user_id == current_user.id,
        )
        .first()
    )

    if token:
        db.delete(token)

    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        "User Logout",
        ip_address,
        browser,
        commit=False,
    )

    db.commit()

    return {
        "message": "Logged Out Successfully",
    }


# ==============================
# Refresh Token
# ==============================

def refresh_access_token(
    refresh_token: str,
    db: Session,
):
    token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == hash_token(refresh_token)
        )
        .first()
    )

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid Refresh Token",
        )

    try:
        payload = jwt.decode(
            refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "refresh":
            raise JWTError()

        user_id = payload.get("sub")

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Refresh Token",
        )

    if token.expires_at.replace(
        tzinfo=timezone.utc
    ) < datetime.now(timezone.utc):

        db.delete(token)
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Refresh token expired",
        )

    user = (
        db.query(User)
        .filter(
            User.id == int(user_id),
            User.status == "ACTIVE",
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "company": user.company_id,
            "role": user.role,
        }
    )

    # Refresh token rotation
    rotated_refresh_token = create_refresh_token(
        {"sub": str(user.id)}
    )

    rotated_payload = jwt.get_unverified_claims(
        rotated_refresh_token
    )

    db.delete(token)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(
                rotated_refresh_token
            ),
            expires_at=datetime.fromtimestamp(
                rotated_payload["exp"],
                tz=timezone.utc,
            ),
        )
    )

    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": rotated_refresh_token,
        "token_type": "bearer",
    }


# ==============================
# Profile
# ==============================

def get_profile(user: User):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "company": {
            "id": user.company_id,
            "name": user.company.name,
        },
        "status": user.status,
        "last_login": user.last_login,
    }


# ==============================
# Change Password
# ==============================

def change_password(
    user: User,
    current_password: str,
    new_password: str,
    db: Session,
    ip_address="Unknown",
    browser="Unknown",
):
    if not verify_password(
        current_password,
        user.password,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password incorrect",
        )

    user.password = hash_password(new_password)

    # Revoke existing refresh tokens
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id
    ).delete()

    create_audit_log(
        db,
        user.company_id,
        user.id,
        "Password Changed",
        ip_address,
        browser,
        commit=False,
    )

    db.commit()

    return {
        "message": "Password changed successfully",
    }


# ==============================
# Forgot Password
# ==============================

def request_password_reset(
    email: str,
    db: Session,
):
    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    # Keep the same response whether the email exists
    # or not to prevent account enumeration.
    if user and user.status == "ACTIVE":

        # Generate password reset token
        reset_token = create_password_reset_token(
            {
                "sub": str(user.id),
            }
        )

        # Send reset link through Resend
        send_reset_email(
            user.email,
            reset_token,
        )

        create_audit_log(
            db,
            user.company_id,
            user.id,
            "Password Reset Requested",
            commit=True,
        )

    return {
        "message": (
            "If an account exists for this email, "
            "password reset instructions will be sent."
        )
    }


# ==============================
# Reset Password
# ==============================

def reset_password(
    token: str,
    new_password: str,
    db: Session,
):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "password_reset":
            raise JWTError()

        user_id = int(payload["sub"])

    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=400,
            detail=(
                "This password reset link "
                "is invalid or expired"
            ),
        )

    user = (
        db.query(User)
        .filter(
            User.id == user_id,
            User.status == "ACTIVE",
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=400,
            detail=(
                "This password reset link "
                "is invalid or expired"
            ),
        )

    user.password = hash_password(new_password)

    # Revoke all existing refresh tokens
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id
    ).delete()

    create_audit_log(
        db,
        user.company_id,
        user.id,
        "Password Changed",
        commit=False,
    )

    db.commit()

    return {
        "message": (
            "Password reset successfully. "
            "Please sign in."
        )
    }