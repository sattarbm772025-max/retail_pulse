"""Central notification creation rules for Task 14.

Priority policy: CRITICAL = no stock; HIGH = likely stockout; MEDIUM = below
reorder level; LOW = informational system events. A dedupe key keeps one active
notification per condition/resource/company until it is read or expires.
"""
from datetime import datetime, timezone

from app.models.notification import Notification

VALID_TYPES = {"STOCKOUT", "STOCKOUT_RISK", "LOW_STOCK", "OVERSTOCK", "IMPORT_COMPLETED", "IMPORT_FAILED", "SALES_ALERT", "SYSTEM_ALERT"}
VALID_PRIORITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def create_notification(db, *, company_id, notification_type, title, message, priority="LOW", user_id=None, audience_roles=None, resource_type=None, resource_id=None, product_id=None, dedupe_key=None, expires_at=None):
    """Create a company/user-scoped notification unless an active duplicate exists."""
    notification_type = notification_type.upper()
    priority = priority.upper()
    if notification_type not in VALID_TYPES:
        raise ValueError("Unsupported notification type")
    if priority not in VALID_PRIORITIES:
        raise ValueError("Unsupported notification priority")
    now = datetime.now(timezone.utc)
    if dedupe_key:
        duplicate = db.query(Notification).filter(
            Notification.company_id == company_id,
            Notification.dedupe_key == dedupe_key,
            Notification.is_read == 0,
        ).filter((Notification.expires_at.is_(None)) | (Notification.expires_at > now)).first()
        if duplicate:
            return duplicate
    record = Notification(
        company_id=company_id, user_id=user_id, product_id=product_id,
        notification_type=notification_type, title=title, message=message,
        audience_roles=",".join(sorted(set(audience_roles or ["SUPER_ADMIN", "COMPANY_ADMIN"]))),
        priority=priority, resource_type=resource_type, resource_id=resource_id,
        dedupe_key=dedupe_key, expires_at=expires_at,
        # Compatibility with the previous notification bell payload.
        level=notification_type,
    )
    db.add(record)
    return record


def expire_active_alerts(db, company_id, product_id, keep_types=()):
    """Resolve old product alerts after stock is healthy again."""
    now = datetime.now(timezone.utc)
    db.query(Notification).filter(
        Notification.company_id == company_id,
        Notification.product_id == product_id,
        Notification.is_read == 0,
        Notification.notification_type.in_(["STOCKOUT", "STOCKOUT_RISK", "LOW_STOCK", "OVERSTOCK"]),
        ~Notification.notification_type.in_(list(keep_types) or ["_"]),
    ).update({Notification.expires_at: now}, synchronize_session=False)
