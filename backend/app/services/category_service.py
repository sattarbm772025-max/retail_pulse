from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product
from app.services.audit_service import create_audit_log


# -------------------------------------------------
# Helper Functions
# -------------------------------------------------

def get_category_or_404(
    db: Session,
    category_id: int,
    company_id: int
) -> Category:

    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.company_id == company_id
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    return category


def serialize_category(
    category: Category,
    product_count: int = 0
) -> dict:

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "status": category.status,
        "product_count": product_count,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
    }


# -------------------------------------------------
# Create Category
# -------------------------------------------------

def create_category(
    db: Session,
    current_user,
    request
):

    existing = (
        db.query(Category)
        .filter(
            Category.company_id == current_user.company_id,
            func.lower(Category.name)
            == request.name.strip().lower()
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists"
        )


    category = Category(
        company_id=current_user.company_id,
        name=request.name.strip(),
        description=request.description,
        status=request.status
    )

    db.add(category)
    db.flush()


    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        f"Category Created: {category.name}",
        commit=False
    )


    db.commit()
    db.refresh(category)


    return serialize_category(category)



# -------------------------------------------------
# Get Categories
# -------------------------------------------------

def get_categories(
    db: Session,
    current_user,
    search: str | None = None,
    status: str | None = None
):

    query = (
        db.query(
            Category,
            func.count(Product.id).label("product_count")
        )
        .outerjoin(
            Product,
            Product.category_id == Category.id
        )
        .filter(
            Category.company_id == current_user.company_id
        )
    )


    if search:
        query = query.filter(
            Category.name.ilike(
                f"%{search.strip()}%"
            )
        )


    if status:
        query = query.filter(
            Category.status == status.upper()
        )


    results = (
        query
        .group_by(Category.id)
        .order_by(Category.name)
        .all()
    )


    return [
        serialize_category(
            category,
            count
        )
        for category, count in results
    ]



# -------------------------------------------------
# Update Category
# -------------------------------------------------

def update_category(
    db: Session,
    current_user,
    category_id: int,
    request
):

    category = get_category_or_404(
        db,
        category_id,
        current_user.company_id
    )


    duplicate = (
        db.query(Category)
        .filter(
            Category.company_id == current_user.company_id,
            func.lower(Category.name)
            == request.name.strip().lower(),
            Category.id != category_id
        )
        .first()
    )


    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists"
        )


    category.name = request.name.strip()
    category.description = request.description
    category.status = request.status


    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        f"Category Updated: {category.name}",
        commit=False
    )


    db.commit()
    db.refresh(category)


    product_count = (
        db.query(Product)
        .filter(
            Product.category_id == category.id
        )
        .count()
    )


    return serialize_category(
        category,
        product_count
    )



# -------------------------------------------------
# Delete Category
# -------------------------------------------------

def delete_category(
    db: Session,
    current_user,
    category_id: int
):

    category = get_category_or_404(
        db,
        category_id,
        current_user.company_id
    )


    product_exists = (
        db.query(Product)
        .filter(
            Product.category_id == category.id
        )
        .first()
    )


    if product_exists:
        raise HTTPException(
            status_code=409,
            detail="Categories with products cannot be deleted"
        )


    category_name = category.name


    db.delete(category)


    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        f"Category Deleted: {category_name}",
        commit=False
    )


    db.commit()


    return {
        "message": "Category deleted successfully"
    }