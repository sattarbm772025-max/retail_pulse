from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.category import Category
from app.models.product import Product
from app.services.audit_service import create_audit_log


def _category_or_404(db: Session, category_id: int, company_id: int) -> Category:
    category = db.query(Category).filter(Category.id == category_id, Category.company_id == company_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


def _serialize(category: Category, product_count: int = 0) -> dict:
    return {"id": category.id, "name": category.name, "description": category.description,
            "status": category.status, "product_count": product_count, "created_at": category.created_at,
            "updated_at": category.updated_at}


def create_category(db, current_user, request):
    if db.query(Category).filter(Category.company_id == current_user.company_id, func.lower(Category.name) == request.name.strip().lower()).first():
        raise HTTPException(status_code=409, detail="A category with this name already exists")
    category = Category(company_id=current_user.company_id, name=request.name.strip(), description=request.description, status=request.status)
    db.add(category); db.flush()
    create_audit_log(db, current_user.company_id, current_user.id, f"Category Created: {category.name}", commit=False)
    db.commit(); db.refresh(category)
    return _serialize(category)


def get_categories(db, current_user, search: str | None = None):
    query = db.query(Category, func.count(Product.id).label("product_count")).outerjoin(Product, Product.category_id == Category.id).filter(Category.company_id == current_user.company_id)
    if search:
        query = query.filter(Category.name.ilike(f"%{search.strip()}%"))
    return [_serialize(category, count) for category, count in query.group_by(Category.id).order_by(Category.name).all()]


def update_category(db, current_user, category_id, request):
    category = _category_or_404(db, category_id, current_user.company_id)
    duplicate = db.query(Category).filter(Category.company_id == current_user.company_id, func.lower(Category.name) == request.name.strip().lower(), Category.id != category_id).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="A category with this name already exists")
    category.name, category.description, category.status = request.name.strip(), request.description, request.status
    create_audit_log(db, current_user.company_id, current_user.id, f"Category Updated: {category.name}", commit=False)
    db.commit(); db.refresh(category)
    return _serialize(category, db.query(Product).filter(Product.category_id == category.id).count())


def delete_category(db, current_user, category_id):
    category = _category_or_404(db, category_id, current_user.company_id)
    if db.query(Product).filter(Product.category_id == category.id).first():
        raise HTTPException(status_code=409, detail="Categories with products cannot be deleted")
    name = category.name
    db.delete(category)
    create_audit_log(db, current_user.company_id, current_user.id, f"Category Deleted: {name}", commit=False)
    db.commit()
    return {"message": "Category deleted successfully"}
