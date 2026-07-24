from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from app.models.category import Category
from app.models.inventory import Inventory, InventoryMovement
from app.models.notification import Notification
from app.models.product import Product
from app.services.audit_service import create_audit_log


# =====================================================
# STOCK STATUS
# =====================================================

def stock_status(
    available: int,
    reorder_level: int
) -> str:
    """
    Returns current stock condition.
    """

    if available == 0:
        return "OUT_OF_STOCK"

    if available <= reorder_level:
        return "LOW_STOCK"

    return "IN_STOCK"


# =====================================================
# INVENTORY CREATION
# =====================================================

def ensure_inventory(
    db,
    product: Product
) -> Inventory:

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.company_id == product.company_id,
            Inventory.product_id == product.id
        )
        .first()
    )

    if inventory:
        return inventory


    quantity = max(product.stock_quantity or 0, 0)

    inventory = Inventory(
        company_id=product.company_id,
        product_id=product.id,
        current_stock=quantity,
        reserved_stock=0,
        available_stock=quantity,
        reorder_level=10,
        stock_status=stock_status(quantity, 10)
    )

    db.add(inventory)
    db.flush()

    return inventory


# =====================================================
# SERIALIZER
# =====================================================

def serialize_inventory(
    inventory: Inventory
) -> dict:

    product = inventory.product

    return {
        "id": inventory.id,

        "product_id": product.id,
        "product_name": product.name,
        "sku": product.sku,

        "category_id": product.category_id,
        "category_name": product.category.name,

        "brand": product.brand,

        "current_stock": inventory.current_stock,
        "reserved_stock": inventory.reserved_stock,
        "available_stock": inventory.available_stock,

        "reorder_level": inventory.reorder_level,
        "stock_status": inventory.stock_status,

        "updated_at": inventory.updated_at
    }


# =====================================================
# NOTIFICATION HANDLER
# =====================================================

def create_stock_notifications(
    db,
    current_user,
    inventory,
    previous_status,
    movement_type,
    quantity,
    reason
):

    product = inventory.product


    if (
        inventory.stock_status == "OUT_OF_STOCK"
        and previous_status != "OUT_OF_STOCK"
    ):

        db.add(
            Notification(
                company_id=current_user.company_id,
                product_id=product.id,
                level="OUT_OF_STOCK",
                message=f"{product.name} became out of stock."
            )
        )


        create_audit_log(
            db,
            current_user.company_id,
            current_user.id,
            "Product Became Out of Stock",
            commit=False,
            entity_type="PRODUCT",
            entity_name=product.name,
            quantity_changed=quantity
        )


    elif (
        inventory.stock_status == "LOW_STOCK"
        and previous_status != "LOW_STOCK"
    ):

        db.add(
            Notification(
                company_id=current_user.company_id,
                product_id=product.id,
                level="LOW_STOCK",
                message=(
                    f"{product.name} reached low stock "
                    f"({inventory.available_stock} available)."
                )
            )
        )


        create_audit_log(
            db,
            current_user.company_id,
            current_user.id,
            "Product Reached Low Stock",
            commit=False,
            entity_type="PRODUCT",
            entity_name=product.name,
            quantity_changed=quantity
        )


    if movement_type != "SALE":

        db.add(
            Notification(
                company_id=current_user.company_id,
                product_id=product.id,
                level="INVENTORY",
                message=(
                    f"{product.name} stock adjusted: {reason}"
                )
            )
        )


# =====================================================
# APPLY STOCK MOVEMENT
# =====================================================

def apply_movement(
    db,
    current_user,
    product: Product,
    movement_type: str,
    quantity_changed: int,
    reason: str,
    remarks: str | None = None
):

    inventory = ensure_inventory(db, product)

    previous_quantity = inventory.current_stock

    updated_quantity = (
        previous_quantity + quantity_changed
    )


    if updated_quantity < 0:
        raise HTTPException(
            status_code=422,
            detail=f"Stock cannot become negative. Available: {previous_quantity}"
        )


    previous_status = inventory.stock_status


    inventory.current_stock = updated_quantity

    inventory.available_stock = (
        updated_quantity - inventory.reserved_stock
    )

    inventory.stock_status = stock_status(
        inventory.available_stock,
        inventory.reorder_level
    )


    product.stock_quantity = updated_quantity

    product.status = (
        "OUT_OF_STOCK"
        if inventory.stock_status == "OUT_OF_STOCK"
        else "ACTIVE"
    )


    movement = InventoryMovement(
        inventory_id=inventory.id,
        movement_type=movement_type,
        quantity_changed=quantity_changed,
        previous_quantity=previous_quantity,
        updated_quantity=updated_quantity,
        reason=reason,
        remarks=remarks,
        performed_by=current_user.id
    )

    db.add(movement)


    actions = {
        "STOCK_IN": "Stock Added",
        "STOCK_OUT": "Stock Removed",
        "MANUAL_ADJUSTMENT": "Stock Adjusted",
        "SALE": "Inventory Updated"
    }


    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        actions.get(
            movement_type,
            "Inventory Updated"
        ),
        commit=False,
        entity_type="PRODUCT",
        entity_name=product.name,
        quantity_changed=quantity_changed
    )


    create_stock_notifications(
        db,
        current_user,
        inventory,
        previous_status,
        movement_type,
        quantity_changed,
        reason
    )


    return inventory



# =====================================================
# GET INVENTORY
# =====================================================

def get_inventory(
    db,
    current_user,
    search=None,
    category_id=None,
    brand=None,
    stock_status_filter=None,
    sort="updated"
):

    query = (
        db.query(Inventory)
        .options(
            joinedload(
                Inventory.product
            )
            .joinedload(
                Product.category
            )
        )
        .join(Product)
        .filter(
            Inventory.company_id == current_user.company_id
        )
    )


    if search:

        keyword = f"%{search.strip()}%"

        query = query.filter(
            or_(
                Product.name.ilike(keyword),
                Product.sku.ilike(keyword)
            )
        )


    if category_id:
        query = query.filter(
            Product.category_id == category_id
        )


    if brand:
        query = query.filter(
            Product.brand.ilike(
                f"%{brand.strip()}%"
            )
        )


    if stock_status_filter:

        query = query.filter(
            Inventory.stock_status
            ==
            stock_status_filter.upper()
        )


    sorting = {

        "name": Product.name.asc(),

        "stock": Inventory.current_stock.asc(),

        "updated": Inventory.updated_at.desc()
    }


    inventories = (
        query
        .order_by(
            sorting.get(
                sort,
                sorting["updated"]
            )
        )
        .all()
    )


    return [
        serialize_inventory(item)
        for item in inventories
    ]


# =====================================================
# ADJUST INVENTORY
# =====================================================

def adjust_inventory(
    db,
    current_user,
    inventory_id,
    request
):

    inventory = (
        db.query(Inventory)
        .options(
            joinedload(
                Inventory.product
            )
            .joinedload(
                Product.category
            )
        )
        .filter(
            Inventory.id == inventory_id,
            Inventory.company_id == current_user.company_id
        )
        .first()
    )


    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )


    quantity = (
        -request.quantity
        if request.adjustment_type == "STOCK_OUT"
        else request.quantity
    )


    inventory = apply_movement(
        db,
        current_user,
        inventory.product,
        request.adjustment_type,
        quantity,
        request.reason,
        request.remarks
    )


    db.commit()
    db.refresh(inventory)


    return serialize_inventory(inventory)
# =====================================================
# UPDATE REORDER LEVEL
# =====================================================

def update_reorder_level(
    db,
    current_user,
    inventory_id: int,
    reorder_level: int
):

    inventory = (
        db.query(Inventory)
        .options(
            joinedload(
                Inventory.product
            )
            .joinedload(
                Product.category
            )
        )
        .filter(
            Inventory.id == inventory_id,
            Inventory.company_id == current_user.company_id
        )
        .first()
    )


    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )


    previous_status = inventory.stock_status


    inventory.reorder_level = reorder_level

    inventory.stock_status = stock_status(
        inventory.available_stock,
        reorder_level
    )


    create_audit_log(
        db,
        current_user.company_id,
        current_user.id,
        "Reorder Level Updated",
        commit=False,
        entity_type="PRODUCT",
        entity_name=inventory.product.name
    )


    create_stock_notifications(
        db,
        current_user,
        inventory,
        previous_status,
        "REORDER_LEVEL",
        0,
        "Reorder level updated"
    )


    db.commit()
    db.refresh(inventory)


    return serialize_inventory(inventory)



# =====================================================
# INVENTORY MOVEMENTS HISTORY
# =====================================================

def movements(
    db,
    current_user,
    inventory_id: int
):

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == inventory_id,
            Inventory.company_id == current_user.company_id
        )
        .first()
    )


    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )


    records = (
        db.query(InventoryMovement)
        .filter(
            InventoryMovement.inventory_id == inventory_id
        )
        .order_by(
            InventoryMovement.created_at.desc()
        )
        .all()
    )


    return [
        {
            "id": movement.id,
            "movement_type": movement.movement_type,
            "quantity_changed": movement.quantity_changed,
            "previous_quantity": movement.previous_quantity,
            "updated_quantity": movement.updated_quantity,
            "reason": movement.reason,
            "remarks": movement.remarks,
            "performed_by": movement.performed_by,
            "created_at": movement.created_at
        }
        for movement in records
    ]



# =====================================================
# INVENTORY SUMMARY
# =====================================================

def summary(
    db,
    current_user
):

    query = (
        db.query(Inventory)
        .filter(
            Inventory.company_id == current_user.company_id
        )
    )


    return {

        "total_products":
            query.count(),


        "total_inventory_quantity":
            query.with_entities(
                func.coalesce(
                    func.sum(
                        Inventory.current_stock
                    ),
                    0
                )
            ).scalar(),


        "low_stock_products":
            query.filter(
                Inventory.stock_status == "LOW_STOCK"
            ).count(),


        "out_of_stock_products":
            query.filter(
                Inventory.stock_status == "OUT_OF_STOCK"
            ).count()
    }



# =====================================================
# INVENTORY CHART DATA
# =====================================================

def charts(
    db,
    current_user
):

    category_rows = (
        db.query(
            Category.name,
            func.sum(
                Inventory.available_stock
            )
        )

        .join(
            Product,
            Product.category_id == Category.id
        )

        .join(
            Inventory,
            Inventory.product_id == Product.id
        )

        .filter(
            Inventory.company_id == current_user.company_id
        )

        .group_by(
            Category.name
        )

        .all()
    )


    status_rows = (
        db.query(
            Inventory.stock_status,
            func.count(
                Inventory.id
            )
        )

        .filter(
            Inventory.company_id == current_user.company_id
        )

        .group_by(
            Inventory.stock_status
        )

        .all()
    )


    return {

        "inventory_by_category": [

            {
                "category": category,
                "quantity": int(quantity or 0)
            }

            for category, quantity in category_rows
        ],


        "stock_status_distribution": [

            {
                "status": status,
                "count": count
            }

            for status, count in status_rows
        ]

    }