from fastapi import HTTPException

from app.models.product import Product
def create_product(
    db,
    current_user,
    request
):

    exists = (
        db.query(Product)
        .filter(Product.sku == request.sku)
        .first()
    )

    if exists:
        raise HTTPException(
            status_code=400,
            detail="SKU already exists"
        )

    product = Product(
        company_id=current_user.company_id,
        name=request.name,
        sku=request.sku,
        category=request.category,
        price=request.price,
        stock=request.stock
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product

def get_products(
    db,
    current_user
):

    return (
        db.query(Product)
        .filter(
            Product.company_id == current_user.company_id
        )
        .all()
    )
    
def get_products(
    db,
    current_user
):

    return (
        db.query(Product)
        .filter(
            Product.company_id == current_user.company_id
        )
        .all()
    )
    
def get_product(
    product_id,
    db,
    current_user
):

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.company_id == current_user.company_id
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product

def update_product(
    product_id,
    request,
    db,
    current_user
):

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.company_id == current_user.company_id
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product.name = request.name
    product.sku = request.sku
    product.category = request.category
    product.price = request.price
    product.stock = request.stock

    db.commit()
    db.refresh(product)

    return product

def delete_product(
    product_id,
    db,
    current_user
):

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.company_id == current_user.company_id
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    db.delete(product)
    db.commit()

    return {
        "message": "Product deleted successfully"
    }
    
