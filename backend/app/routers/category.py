from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_role,
)

from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
)

from app.services.category_service import (
    create_category,
    get_categories,
    update_category,
    delete_category,
)


router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)



# -------------------------
# Create Category
# -------------------------

@router.post("/")
def create(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(
            "SUPER_ADMIN",
            "COMPANY_ADMIN",
        )
    ),
):
    """
    Create a new category.

    Allowed roles:
    - SUPER_ADMIN
    - COMPANY_ADMIN
    """

    return create_category(
        db,
        current_user,
        payload,
    )



# -------------------------
# Get Categories
# -------------------------

@router.get("/")
def all_categories(
    search: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        get_current_user
    ),
):
    """
    Get company categories.

    Supports:
    - Search by category name
    - Filter by status
    """

    return get_categories(
        db,
        current_user,
        search,
        status,
    )



# -------------------------
# Update Category
# -------------------------

@router.put("/{category_id}")
def update(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(
            "SUPER_ADMIN",
            "COMPANY_ADMIN",
        )
    ),
):
    """
    Update existing category.
    """

    return update_category(
        db,
        current_user,
        category_id,
        payload,
    )



# -------------------------
# Delete Category
# -------------------------

@router.delete("/{category_id}")
def delete(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(
            "SUPER_ADMIN",
            "COMPANY_ADMIN",
        )
    ),
):
    """
    Delete category.

    Category deletion should fail
    if products are linked.
    """

    return delete_category(
        db,
        current_user,
        category_id,
    )