from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class Notification(Base):
    """
    Stores company-level notifications.

    Examples:
    - Low stock alert
    - Out of stock warning
    - Product updates
    """

    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    company_id = Column(
        Integer,
        ForeignKey(
            "companies.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    product_id = Column(
        Integer,
        ForeignKey(
            "products.id",
            ondelete="CASCADE",
        ),
        nullable=True,
        index=True,
    )

    # Null means a company-wide notification visible to authorized roles.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    # Comma-delimited roles permitted to read a company-wide notification.
    audience_roles = Column(String(160), nullable=True)

    notification_type = Column(String(40), nullable=False, default="SYSTEM_ALERT", index=True)

    title = Column(String(160), nullable=True)

    priority = Column(String(20), nullable=False, default="LOW", index=True)

    resource_type = Column(String(50), nullable=True)

    resource_id = Column(Integer, nullable=True, index=True)

    # A stable key prevents the same active condition from creating repeated alerts.
    dedupe_key = Column(String(255), nullable=True, index=True)

    message = Column(
        String(500),
        nullable=False,
    )

    level = Column(
        String(20),
        nullable=False,
        default="INFO",
    )

    is_read = Column(
        Integer,
        nullable=False,
        default=0,
    )

    read_at = Column(DateTime(timezone=True), nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
