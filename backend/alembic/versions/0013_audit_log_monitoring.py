"""Extend audit records for activity monitoring.

Revision ID: 0013_audit_log_monitoring
Revises: 0012_data_import_history
"""
from alembic import op
import sqlalchemy as sa

revision = "0013_audit_log_monitoring"
down_revision = "0012_data_import_history"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("audit_logs", sa.Column("resource_id", sa.Integer(), nullable=True))
    op.add_column("audit_logs", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("audit_logs", sa.Column("before_values", sa.Text(), nullable=True))
    op.add_column("audit_logs", sa.Column("after_values", sa.Text(), nullable=True))
    op.add_column("audit_logs", sa.Column("status", sa.String(length=20), nullable=False, server_default="SUCCESS"))
    op.create_index("ix_audit_logs_resource_id", "audit_logs", ["resource_id"])
    op.create_index("ix_audit_logs_status", "audit_logs", ["status"])
    op.create_index("ix_audit_logs_company_created", "audit_logs", ["company_id", "created_at"])


def downgrade():
    op.drop_index("ix_audit_logs_company_created", table_name="audit_logs")
    op.drop_index("ix_audit_logs_status", table_name="audit_logs")
    op.drop_index("ix_audit_logs_resource_id", table_name="audit_logs")
    op.drop_column("audit_logs", "status")
    op.drop_column("audit_logs", "after_values")
    op.drop_column("audit_logs", "before_values")
    op.drop_column("audit_logs", "description")
    op.drop_column("audit_logs", "resource_id")
