from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Product(Base):
    """
    Product model.

    Stores company-specific products with:
    - Category relationship
    - Pricing information
    - Inventory quantity
    - Product status
    """

    __tablename__ = "products"

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "sku",
            name="uq_product_company_sku",
        ),
        UniqueConstraint(
            "company_id",
            "category_id",
            "name",
            name="uq_product_company_category_name",
        ),
    )

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

    category_id = Column(
        Integer,
        ForeignKey(
            "categories.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    name = Column(
        String(200),
        nullable=False,
    )

    sku = Column(
        String(100),
        nullable=False,
    )

    brand = Column(
        String(100),
        nullable=True,
    )

    description = Column(
        String(1000),
        nullable=True,
    )

    unit_price = Column(
        Float,
        nullable=False,
    )

    cost_price = Column(
        Float,
        nullable=False,
    )

    stock_quantity = Column(
        Integer,
        nullable=False,
        default=0,
    )

    unit_of_measure = Column(
        String(50),
        nullable=False,
        default="Unit",
    )

    status = Column(
        String(20),
        nullable=False,
        default="ACTIVE",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


    # Relationships

    company = relationship(
        "Company",
    )

    category = relationship(
        "Category",
        back_populates="products",
    )