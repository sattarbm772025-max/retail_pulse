from fastapi import HTTPException
from sqlalchemy import or_

from app.models.category import Category
from app.models.product import Product
from app.services.inventory_service import ensure_inventory
from app.services.audit_service import create_audit_log


# -----------------------------
# Helpers
# -----------------------------

def get_product_or_404(db, product_id: int, company_id: int):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.company_id == company_id
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


def validate_category(
    db,
    category_id: int,
    company_id: int
):
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
            status_code=422,
            detail="Category does not belong to your company"
        )

    return category


def serialize_product(product):

    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,

        "category_id": product.category_id,
        "category_name": product.category.name,

        "brand": product.brand,
        "description": product.description,

        "unit_price": product.unit_price,
        "cost_price": product.cost_price,

        "stock_quantity": product.stock_quantity,

        "unit_of_measure": product.unit_of_measure,

        "status": product.status,

        "created_at": product.created_at,
        "updated_at": product.updated_at,
    }


def check_duplicate(
    db,
    request,
    company_id,
    exclude_id=None
):

    sku_query = (
        db.query(Product)
        .filter(
            Product.company_id == company_id,
            Product.sku == request.sku
        )
    )


    name_query = (
        db.query(Product)
        .filter(
            Product.company_id == company_id,
            Product.category_id == request.category_id,
            Product.name.ilike(request.name)
        )
    )


    if exclude_id:

        sku_query = sku_query.filter(
            Product.id != exclude_id
        )

        name_query = name_query.filter(
            Product.id != exclude_id
        )


    if sku_query.first():

        raise HTTPException(
            status_code=409,
            detail="SKU already exists in this company"
        )


    if name_query.first():

        raise HTTPException(
            status_code=409,
            detail="A product with this name already exists in this category"
        )



# -----------------------------
# Create Product
# -----------------------------

def create_product(
    db,
    current_user,
    request
):

    validate_category(
        db,
        request.category_id,
        current_user.company_id
    )


    check_duplicate(
        db,
        request,
        current_user.company_id
    )


    product = Product(
        company_id=current_user.company_id,
        **request.model_dump()
    )


    db.add(product)

    db.flush()


    # create inventory automatically
    ensure_inventory(
        db,
        product
    )


    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        f"Product Created: {product.name}",
        commit=False
    )


    db.commit()

    db.refresh(product)


    return serialize_product(product)



# -----------------------------
# Get Products
# -----------------------------

def get_products(
    db,
    current_user,
    search=None,
    category_id=None,
    status=None,
    brand=None,
    sort="recent"
):

    query = (
        db.query(Product)
        .filter(
            Product.company_id == current_user.company_id
        )
    )


    if search:

        keyword = f"%{search.strip()}%"

        query = query.filter(
            or_(
                Product.name.ilike(keyword),
                Product.sku.ilike(keyword),
                Product.brand.ilike(keyword)
            )
        )


    if category_id:

        query = query.filter(
            Product.category_id == category_id
        )


    if status:

        query = query.filter(
            Product.status == status.upper()
        )


    if brand:

        query = query.filter(
            Product.brand.ilike(
                f"%{brand.strip()}%"
            )
        )


    ordering = {

        "name":
            Product.name.asc(),

        "price":
            Product.unit_price.asc(),

        "recent":
            Product.created_at.desc()

    }


    products = (
        query
        .order_by(
            ordering.get(
                sort,
                Product.created_at.desc()
            )
        )
        .all()
    )


    return [
        serialize_product(product)
        for product in products
    ]



# -----------------------------
# Get Single Product
# -----------------------------

def get_product(
    product_id,
    db,
    current_user
):

    product = get_product_or_404(
        db,
        product_id,
        current_user.company_id
    )

    return serialize_product(product)



# -----------------------------
# Update Product
# -----------------------------

def update_product(
    product_id,
    request,
    db,
    current_user
):

    product = get_product_or_404(
        db,
        product_id,
        current_user.company_id
    )


    validate_category(
        db,
        request.category_id,
        current_user.company_id
    )


    check_duplicate(
        db,
        request,
        current_user.company_id,
        product_id
    )


    old_status = product.status


    for key, value in request.model_dump().items():

        setattr(
            product,
            key,
            value
        )


    if old_status != product.status:

        action = (
            f"Product Activated: {product.name}"
            if product.status == "ACTIVE"
            else
            f"Product Deactivated: {product.name}"
        )

    else:

        action = (
            f"Product Updated: {product.name}"
        )


    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        action,
        commit=False
    )


    db.commit()

    db.refresh(product)


    return serialize_product(product)



# -----------------------------
# Delete Product
# -----------------------------

def delete_product(
    product_id,
    db,
    current_user
):

    product = get_product_or_404(
        db,
        product_id,
        current_user.company_id
    )


    name = product.name


    db.delete(product)


    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        f"Product Deleted: {name}",
        commit=False
    )


    db.commit()


    return {
        "message": "Product deleted successfully"
    }



# -----------------------------
# Product Dashboard Summary
# -----------------------------

def get_summary(
    db,
    current_user
):

    query = (
        db.query(Product)
        .filter(
            Product.company_id == current_user.company_id
        )
    )


    total = query.count()

    active = (
        query
        .filter(Product.status == "ACTIVE")
        .count()
    )


    categories = (
        db.query(Category)
        .filter(
            Category.company_id ==
            current_user.company_id
        )
        .count()
    )


    return {

        "total_products": total,

        "active_products": active,

        "inactive_products": total - active,

        "total_categories": categories
    }
