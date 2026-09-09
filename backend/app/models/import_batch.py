from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ImportBatch(Base):
    """Company-scoped, staged CSV import; source_data preserves the review step."""

    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    import_type = Column(String(20), nullable=False)
    filename = Column(String(255), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    source_data = Column(Text, nullable=False)
    total_records = Column(Integer, nullable=False, default=0)
    successful_records = Column(Integer, nullable=False, default=0)
    failed_records = Column(Integer, nullable=False, default=0)
    duplicate_records = Column(Integer, nullable=False, default=0)
    status = Column(String(30), nullable=False, default="PENDING")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    errors = relationship("ImportError", back_populates="batch", cascade="all, delete-orphan")


class ImportError(Base):
    __tablename__ = "import_errors"

    id = Column(Integer, primary_key=True)
    import_id = Column(Integer, ForeignKey("import_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)
    row_data = Column(Text, nullable=True)
    error_type = Column(String(30), nullable=False)
    error_message = Column(String(1000), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    batch = relationship("ImportBatch", back_populates="errors")
