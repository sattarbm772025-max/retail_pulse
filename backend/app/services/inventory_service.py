from fastapi import HTTPException
from app.models.inventory import Inventory
from app.models.product import Product


def create_inventory(db, current_user, request):
    product = db.query(Product).filter(
        Product.id == request.product_id,
        Product.company_id == current_user.company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    inventory = Inventory(
        company_id=current_user.company_id,
        product_id=request.product_id,
        quantity=request.quantity,
        reorder_level=request.reorder_level
    )

    db.add(inventory)
    db.commit()
    db.refresh(inventory)

    return inventory


def get_inventory(db, current_user):

    return (
        db.query(Inventory)
        .filter(
            Inventory.company_id == current_user.company_id
        )
        .all()
    )
