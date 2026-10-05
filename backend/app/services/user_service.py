from fastapi import HTTPException

from app.core.security import hash_password
from app.models.user import User
from app.services.audit_service import create_audit_log

# =================================================
# Get Users
# =================================================


def get_users(db, current_user):

    return db.query(User).filter(User.company_id == current_user.company_id).all()


# =================================================
# Create User
# =================================================


def create_user(db, current_user, request):

    allowed_roles = {"SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST", "VIEWER"}

    if request.role not in allowed_roles:

        raise HTTPException(status_code=422, detail="Invalid role")

    if request.role == "SUPER_ADMIN" and current_user.role != "SUPER_ADMIN":

        raise HTTPException(
            status_code=403, detail="Only a Super Admin can assign that role"
        )

    if db.query(User).filter(User.email == request.email).first():

        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        company_id=current_user.company_id,
        name=request.name,
        email=request.email,
        password=hash_password(request.password),
        role=request.role,
        status="ACTIVE",
    )

    db.add(user)

    create_audit_log(db, current_user.company_id, current_user.id, "USER_CREATE", commit=False, entity_type="USER", entity_name=user.name, resource_id=user.id, description=f"Created user {user.email}", after_values={"role": user.role, "status": user.status})
    db.commit()

    db.refresh(user)

    return user


def update_user(db, current_user, user_id, request):
    user = db.query(User).filter(User.id == user_id, User.company_id == current_user.company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if request.role not in {"SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST", "VIEWER"} or request.status not in {"ACTIVE", "INACTIVE"}:
        raise HTTPException(status_code=422, detail="Invalid user role or status")
    if request.role == "SUPER_ADMIN" and current_user.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only a Super Admin can assign that role")
    before = {"name": user.name, "role": user.role, "status": user.status}
    user.name, user.role, user.status = request.name, request.role, request.status
    action = "ROLE_CHANGE" if before["role"] != user.role else "USER_UPDATE"
    create_audit_log(db, current_user.company_id, current_user.id, action, commit=False, entity_type="USER", entity_name=user.name, resource_id=user.id, description=f"User role changed from {before['role']} to {user.role}" if action == "ROLE_CHANGE" else f"Updated user {user.email}", before_values=before, after_values={"name": user.name, "role": user.role, "status": user.status})
    db.commit(); db.refresh(user)
    return user
