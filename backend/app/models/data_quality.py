"""Task 16 persistence for reconciliation runs and their company-scoped issues."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class ReconciliationRun(Base):
    __tablename__ = "reconciliation_runs"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    triggered_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    records_checked = Column(Integer, nullable=False, default=0)
    issues_detected = Column(Integer, nullable=False, default=0)
    issues_resolved = Column(Integer, nullable=False, default=0)
    failed_checks = Column(Integer, nullable=False, default=0)
    status = Column(String(40), nullable=False, default="RUNNING", index=True)
    error_message = Column(Text, nullable=True)


class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_type = Column(String(80), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    module = Column(String(50), nullable=False, index=True)
    record_type = Column(String(50), nullable=True)
    record_id = Column(Integer, nullable=True, index=True)
    record_label = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    dedupe_key = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="OPEN", index=True)
    detected_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    last_detected_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_note = Column(Text, nullable=True)
    previous_status = Column(String(30), nullable=True)
