"""Persistence models for Task 15 reporting metadata.

Business rows are never copied here: generated reports always query the existing
sales, inventory, customer and stock-movement tables.  These tables only keep a
company-scoped audit trail and the configuration for future scheduled reports.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.sql import func

from app.core.database import Base


class ReportHistory(Base):
    __tablename__ = "report_history"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    report_type = Column(String(50), nullable=False, index=True)
    report_name = Column(String(160), nullable=False)
    filters = Column(JSON, nullable=False, default=dict)
    export_format = Column(String(10), nullable=False, default="VIEW")
    status = Column(String(30), nullable=False, default="COMPLETED", index=True)
    failure_reason = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    report_type = Column(String(50), nullable=False)
    report_name = Column(String(160), nullable=False)
    filters = Column(JSON, nullable=False, default=dict)
    frequency = Column(String(20), nullable=False)
    execution_time = Column(String(5), nullable=False)
    recipients = Column(JSON, nullable=False, default=list)
    export_format = Column(String(10), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_generated_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String(30), nullable=True)
    last_error = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
