from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.schemas.inventory import InventoryAdjustment, ReorderLevelUpdate
from app.services.inventory_service import (
    adjust_inventory,
    charts,
    get_inventory,
    movements,
    summary,
    update_reorder_level,
)
from app.services.replenishment_service import recommendation_detail, recommendations

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
)


# Admin permissions
admin_role = require_role(
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
)
inventory_viewer_role = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")


@router.get("/forecast")
@router.get("/recommendations")
def forecast_recommendations(
    forecast_days: int = 30,
    risk: str | None = None,
    category_id: int | None = None,
    supplier: str | None = None,
    product_id: int | None = None,
    reorder_required: bool | None = None,
    sort: str = "risk",
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(inventory_viewer_role),
):
    """Task 11: company-scoped demand forecast and stock recommendations."""
    return recommendations(
        db,
        current_user,
        forecast_days=forecast_days,
        risk=risk,
        category_id=category_id,
        supplier=supplier,
        product_id=product_id,
        reorder_required=reorder_required,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/recommendations/{product_id}")
def forecast_recommendation_detail(
    product_id: int,
    forecast_days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(inventory_viewer_role),
):
    """Task 11: detailed comparison and API-generated demand history."""
    return recommendation_detail(db, current_user, product_id, forecast_days)


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
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(inventory_viewer_role),
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
        page,
        page_size,
    )


# -------------------------
# Inventory Summary
# -------------------------


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user=Depends(inventory_viewer_role),
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
    current_user=Depends(inventory_viewer_role),
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
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(inventory_viewer_role),
):
    """
    Get inventory movement history.
    """

    return movements(
        db,
        current_user,
        inventory_id,
        page,
        page_size,
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
        payload.reason,
    )
