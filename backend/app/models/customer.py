from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("company_id", "email", name="uq_customer_company_email"),
        UniqueConstraint("company_id", "phone", name="uq_customer_company_phone"),
        UniqueConstraint("company_id", "customer_code", name="uq_customer_company_code"),
    )
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_code = Column(String(30), nullable=False)
    full_name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(30), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    customer_type = Column(String(30), nullable=False)
    preferred_sales_channel = Column(String(30), nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE")
    segment = Column(String(20), nullable=False, default="NEW")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CustomerPurchaseSummary(Base):
    __tablename__ = "customer_purchase_summary"
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), primary_key=True)
    total_orders = Column(Integer, nullable=False, default=0)
    total_revenue = Column(Float, nullable=False, default=0)
    quantity_purchased = Column(Integer, nullable=False, default=0)
    average_order_value = Column(Float, nullable=False, default=0)
    first_purchase_at = Column(DateTime(timezone=True), nullable=True)
    last_purchase_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CustomerTimeline(Base):
    __tablename__ = "customer_timeline"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    description = Column(String(500), nullable=False)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
