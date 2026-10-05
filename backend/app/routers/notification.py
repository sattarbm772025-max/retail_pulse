from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.notification import Notification
from app.models.product import Product
from app.models.inventory import Inventory
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _visible(query, user):
    query = query.filter(Notification.company_id == user.company_id)
    personal = Notification.user_id == user.id
    if user.role in {"SUPER_ADMIN", "COMPANY_ADMIN"}:
        return query.filter(or_(Notification.user_id.is_(None), personal))
    if user.role == "ANALYST":
        return query.filter(or_(personal, Notification.audience_roles.ilike("%ANALYST%")))
    return query.filter(personal)


def _serialize(record):
    return {"id": record.id, "title": record.title or record.level.replace("_", " ").title(), "message": record.message, "type": record.notification_type or record.level, "priority": record.priority or "LOW", "resource_type": record.resource_type, "resource_id": record.resource_id or record.product_id, "product_id": record.product_id, "is_read": bool(record.is_read), "created_at": record.created_at, "read_at": record.read_at, "expires_at": record.expires_at}


@router.get("/")
def list_notifications(page: int = 1, page_size: int = 20, state: str = "ALL", notification_type: str | None = None, priority: str | None = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = _visible(db.query(Notification), current_user).filter(or_(Notification.expires_at.is_(None), Notification.expires_at > datetime.now(timezone.utc)))
    if state.upper() == "UNREAD": query = query.filter(Notification.is_read == 0)
    elif state.upper() == "READ": query = query.filter(Notification.is_read == 1)
    if notification_type: query = query.filter(Notification.notification_type == notification_type.upper())
    if priority: query = query.filter(Notification.priority == priority.upper())
    page_size = min(max(page_size, 1), 100); total = query.count()
    records = query.order_by(Notification.created_at.desc()).offset((max(page, 1) - 1) * page_size).limit(page_size).all()
    return {"items": [_serialize(record) for record in records], "total": total, "page": page, "page_size": page_size, "total_pages": max((total + page_size - 1) // page_size, 1)}


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    count = _visible(db.query(Notification), current_user).filter(Notification.is_read == 0, or_(Notification.expires_at.is_(None), Notification.expires_at > datetime.now(timezone.utc))).count()
    return {"unread_count": count}


@router.patch("/read-all")
def read_all(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = _visible(db.query(Notification), current_user).filter(Notification.is_read == 0)
    updated = query.update({Notification.is_read: 1, Notification.read_at: datetime.now(timezone.utc)}, synchronize_session=False)
    if updated:
        create_audit_log(db, current_user.company_id, current_user.id, "NOTIFICATIONS_READ", commit=False, entity_type="NOTIFICATION", description=f"Marked {updated} notifications as read")
    db.commit()
    return {"updated": updated}


@router.get("/{notification_id}")
def notification_detail(notification_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    record = _visible(db.query(Notification), current_user).filter(Notification.id == notification_id).first()
    if not record: raise HTTPException(status_code=404, detail="Notification not found")
    data = _serialize(record)
    if record.product_id:
        product = db.query(Product).filter(Product.id == record.product_id, Product.company_id == current_user.company_id).first()
        inventory = db.query(Inventory).filter(Inventory.product_id == record.product_id, Inventory.company_id == current_user.company_id).first()
        if product: data["resource_details"] = {"product": product.name, "sku": product.sku, "current_stock": inventory.available_stock if inventory else product.stock_quantity, "reorder_point": inventory.reorder_level if inventory else None, "stock_status": inventory.stock_status if inventory else None}
    return data


@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    record = _visible(db.query(Notification), current_user).filter(Notification.id == notification_id).first()
    if not record: raise HTTPException(status_code=404, detail="Notification not found")
    if not record.is_read:
        record.is_read = 1; record.read_at = datetime.now(timezone.utc); db.commit()
    return _serialize(record)
