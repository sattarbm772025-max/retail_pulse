from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.company import Company
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.category import Category

from app.schemas.auth import CompanyRegister
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
)

from app.services.audit_service import create_audit_log

from jose import jwt, JWTError
from app.core.config import SECRET_KEY, ALGORITHM

def register_company(
    request: CompanyRegister,
    db: Session
):

    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    if len(request.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters"
        )

    company = db.query(Company).filter(
        (Company.email == request.company_email) | (Company.name == request.company_name)
    ).first()

    if company:
        raise HTTPException(
            status_code=400,
            detail="A company with this name or email already exists"
        )

    user = db.query(User).filter(
        User.email == request.owner_email
    ).first()

    if user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    company = Company(
        name=request.company_name,
        industry=request.industry,
        email=request.company_email,
        address=request.company_address,
        phone=request.company_phone
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
        db.add_all([
            Category(company_id=company.id, name=name, description=f"Default {name} category", status="ACTIVE")
            for name in ("Mobile", "Laptop", "Accessories", "Clothing")
        ])
        create_audit_log(db, company.id, admin.id, "Company Registered", commit=False)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "message": "Company Registered Successfully"
    }
def login_user(
    email: str,
    password: str,
    db: Session,
    ip_address: str = "Unknown",
    browser: str = "Unknown",
):

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid Email or Password"
        )

    if not verify_password(
        password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid Email or Password"
        )

    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="This account is inactive")

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "company": user.company_id,
            "role": user.role
        }
    )

    refresh_token = create_refresh_token(
        {
            "sub": str(user.id)
        }
    )

    payload = jwt.get_unverified_claims(refresh_token)
    token = RefreshToken(user_id=user.id, token_hash=hash_token(refresh_token),
                         expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc))

    db.add(token)

    user.last_login = datetime.now(timezone.utc)
    create_audit_log(db, user.company_id, user.id, "User Login", ip_address, browser, commit=False)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
def logout_user(
    refresh_token: str,
    db: Session,
    current_user: User,
    ip_address: str = "Unknown",
    browser: str = "Unknown",
):

    token = db.query(
        RefreshToken
    ).filter(
        RefreshToken.token_hash == hash_token(refresh_token),
        RefreshToken.user_id == current_user.id,
    ).first()

    if token:
        db.delete(token)
    create_audit_log(db, current_user.company_id, current_user.id, "User Logout", ip_address, browser, commit=False)
    db.commit()

    return {
        "message": "Logged Out Successfully"
    }
def refresh_access_token(
    refresh_token: str,
    db: Session
):

    token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hash_token(refresh_token),
    ).first()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid Refresh Token"
        )

    try:
        payload = jwt.decode(
            refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")
        if not user_id or payload.get("type") != "refresh":
            raise JWTError()

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Refresh Token"
        )

    if token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.delete(token)
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    user = db.query(User).filter(User.id == int(user_id), User.status == "ACTIVE").first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User Not Found"
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "company": user.company_id,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
def get_profile(user: User):

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "company": {"id": user.company_id, "name": user.company.name},
        "status": user.status,
        "last_login": user.last_login
    }


def change_password(user: User, current_password: str, new_password: str, db: Session,
                    ip_address: str = "Unknown", browser: str = "Unknown"):
    if not verify_password(current_password, user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password = hash_password(new_password)
    # Password rotation invalidates every existing refresh session.
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    create_audit_log(db, user.company_id, user.id, "Password Changed", ip_address, browser, commit=False)
    db.commit()
    return {"message": "Password changed successfully"}


def request_password_reset(email: str, db: Session):
    # Intentionally generic until an email provider and signed reset-link flow are configured.
    # Never reveal whether an account exists.
    return {"message": "If an account exists for this email, password reset instructions will be sent."}
