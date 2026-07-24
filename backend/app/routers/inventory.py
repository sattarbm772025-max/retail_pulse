from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_role,
)

from app.schemas.inventory import (
    InventoryAdjustment,
    ReorderLevelUpdate,
)

from app.services.inventory_service import (
    adjust_inventory,
    charts,
    get_inventory,
    movements,
    summary,
    update_reorder_level,
)


router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
)


# Admin permissions
admin_role = require_role(
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
)



# -------------------------
# Get Inventory List
# -------------------------

@router.get("/")
def all_inventory(
    search: str | None = None,
    category_id: int | None = None,
    brand: str | None = None,
    stock_status: str | None = None,
    sort: str = "updated",

    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get company inventory.

    Filters:
    - Search product/SKU
    - Category
    - Brand
    - Stock status
    - Sorting
    """

    return get_inventory(
        db,
        current_user,
        search,
        category_id,
        brand,
        stock_status,
        sort,
    )



# -------------------------
# Inventory Summary
# -------------------------

@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Inventory dashboard cards.
    """

    return summary(
        db,
        current_user,
    )



# -------------------------
# Inventory Charts
# -------------------------

@router.get("/charts")
def get_charts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Inventory analytics charts.
    """

    return charts(
        db,
        current_user,
    )



# -------------------------
# Movement History
# -------------------------

@router.get("/{inventory_id}/movements")
def history(
    inventory_id: int,

    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get inventory movement history.
    """

    return movements(
        db,
        current_user,
        inventory_id,
    )



# -------------------------
# Stock Adjustment
# -------------------------

@router.post("/{inventory_id}/adjust")
def adjust(
    inventory_id: int,
    payload: InventoryAdjustment,

    db: Session = Depends(get_db),
    current_user=Depends(admin_role),
):
    """
    Increase/decrease inventory.

    Allowed:
    - SUPER_ADMIN
    - COMPANY_ADMIN
    """

    return adjust_inventory(
        db,
        current_user,
        inventory_id,
        payload,
    )



# -------------------------
# Update Reorder Level
# -------------------------

@router.put("/{inventory_id}/reorder-level")
def reorder(
    inventory_id: int,
    payload: ReorderLevelUpdate,

    db: Session = Depends(get_db),
    current_user=Depends(admin_role),
):
    """
    Update minimum stock alert level.
    """

    return update_reorder_level(
        db,
        current_user,
        inventory_id,
        payload.reorder_level,
    )