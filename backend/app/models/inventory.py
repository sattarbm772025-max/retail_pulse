from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "product_id",
            name="uq_inventory_company_product",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
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
        nullable=False,
        index=True,
    )

    current_stock = Column(
        Integer,
        nullable=False,
        default=0,
    )

    reserved_stock = Column(
        Integer,
        nullable=False,
        default=0,
    )

    available_stock = Column(
        Integer,
        nullable=False,
        default=0,
    )

    reorder_level = Column(
        Integer,
        nullable=False,
        default=10,
    )

    stock_status = Column(
        String(20),
        nullable=False,
        default="OUT_OF_STOCK",
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


    # Relationships
    product = relationship(
        "Product"
    )

    movements = relationship(
        "InventoryMovement",
        back_populates="inventory",
        cascade="all, delete-orphan",
    )



class InventoryMovement(Base):
    __tablename__ = "inventory_movements"


    id = Column(
        Integer,
        primary_key=True,
    )

    inventory_id = Column(
        Integer,
        ForeignKey(
            "inventory.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    movement_type = Column(
        String(30),
        nullable=False,
    )

    quantity_changed = Column(
        Integer,
        nullable=False,
    )

    previous_quantity = Column(
        Integer,
        nullable=False,
    )

    updated_quantity = Column(
        Integer,
        nullable=False,
    )

    reason = Column(
        String(255),
        nullable=False,
    )

    remarks = Column(
        String(500),
        nullable=True,
    )

    performed_by = Column(
        Integer,
        ForeignKey(
            "users.id"
        ),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


    # Relationship
    inventory = relationship(
        "Inventory",
        back_populates="movements",
    )