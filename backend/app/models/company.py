from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    String,
)
from sqlalchemy.sql import func

from app.core.database import Base



class Company(Base):
    __tablename__ = "companies"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    name = Column(
        String(200),
        unique=True,
        nullable=False,
    )


    industry = Column(
        String(100),
        nullable=False,
    )


    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )


    address = Column(
        String(500),
        nullable=True,
    )


    phone = Column(
        String(20),
        nullable=True,
    )


    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )