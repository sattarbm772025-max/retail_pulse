from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role

from app.schemas.product import (
    ProductCreate,
    ProductUpdate
)

from app.services.product_service import (
    create_product,
    get_products,
    get_product,
    update_product,
    delete_product,
    get_summary
)


router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


# Create Product
@router.post("/")
def create(
    request: ProductCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("SUPER_ADMIN", "COMPANY_ADMIN")
    )
):
    return create_product(
        db,
        current_user,
        request
    )


# Get Products
@router.get("/")
def all_products(
    search: str | None = None,
    category_id: int | None = None,
    status: str | None = None,
    brand: str | None = None,
    sort: str = "recent",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_products(
        db,
        current_user,
        search,
        category_id,
        status,
        brand,
        sort
    )


# Product Dashboard Summary
@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_summary(
        db,
        current_user
    )


# Get Single Product
@router.get("/{product_id}")
def single_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_product(
        product_id,
        db,
        current_user
    )


# Update Product
@router.put("/{product_id}")
def update(
    product_id: int,
    request: ProductUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("SUPER_ADMIN", "COMPANY_ADMIN")
    )
):
    return update_product(
        product_id,
        request,
        db,
        current_user
    )


# Delete Product
@router.delete("/{product_id}")
def delete(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("SUPER_ADMIN", "COMPANY_ADMIN")
    )
):
    return delete_product(
        product_id,
        db,
        current_user
    )