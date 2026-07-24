from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    """
    User model.

    Stores application users connected to a company.

    Supports:
    - Multi-company architecture
    - Role-based access control
    - Authentication
    - Login tracking
    """

    __tablename__ = "users"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    company_id = Column(
        Integer,
        ForeignKey(
            "companies.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )


    name = Column(
        String(100),
        nullable=False,
    )


    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )


    password = Column(
        String(255),
        nullable=False,
    )


    role = Column(
        String(50),
        nullable=False,
        default="VIEWER",
    )


    status = Column(
        String(20),
        nullable=False,
        default="ACTIVE",
    )


    last_login = Column(
        DateTime(timezone=True),
        nullable=True,
    )


    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


    # Relationship

    company = relationship(
        "Company",
    )