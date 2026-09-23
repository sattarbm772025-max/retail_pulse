from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(
        Integer,
        primary_key=True,
    )

    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    action = Column(
        String(255),
        nullable=False,
    )

    entity_type = Column(
        String(50),
        nullable=True,
    )

    entity_name = Column(
        String(255),
        nullable=True,
    )

    resource_id = Column(Integer, nullable=True, index=True)

    description = Column(Text, nullable=True)

    before_values = Column(Text, nullable=True)

    after_values = Column(Text, nullable=True)

    status = Column(String(20), nullable=False, default="SUCCESS", index=True)

    quantity_changed = Column(
        Integer,
        nullable=True,
    )

    ip_address = Column(
        String(50),
        nullable=True,
    )

    browser = Column(
        String(255),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user = relationship("User")
