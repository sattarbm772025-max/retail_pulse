from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])
notification_roles = require_role("SUPER_ADMIN", "COMPANY_ADMIN")


@router.get("/")
def list_notifications(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(notification_roles),
):
    """Return the newest company stock notifications for company admins."""
    records = (
        db.query(Notification)
        .filter(Notification.company_id == current_user.company_id)
        .order_by(Notification.created_at.desc())
        .limit(min(max(limit, 1), 50))
        .all()
    )
    return [
        {
            "id": record.id,
            "message": record.message,
            "level": record.level,
            "created_at": record.created_at,
        }
        for record in records
    ]
