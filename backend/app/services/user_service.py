from fastapi import HTTPException

from app.models.user import User
from app.core.security import hash_password



# =================================================
# Get Users
# =================================================

def get_users(
    db,
    current_user
):

    return (
        db.query(User)
        .filter(
            User.company_id == current_user.company_id
        )
        .all()
    )



# =================================================
# Create User
# =================================================

def create_user(
    db,
    current_user,
    request
):

    allowed_roles = {
        "SUPER_ADMIN",
        "COMPANY_ADMIN",
        "ANALYST",
        "VIEWER"
    }


    if request.role not in allowed_roles:

        raise HTTPException(
            status_code=422,
            detail="Invalid role"
        )


    if (
        request.role == "SUPER_ADMIN"
        and current_user.role != "SUPER_ADMIN"
    ):

        raise HTTPException(
            status_code=403,
            detail="Only a Super Admin can assign that role"
        )


    if (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    ):

        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )


    user = User(

        company_id=current_user.company_id,

        name=request.name,

        email=request.email,

        password=hash_password(
            request.password
        ),

        role=request.role,

        status="ACTIVE"

    )


    db.add(user)

    db.commit()

    db.refresh(user)


    return user