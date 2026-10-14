"""Create reporting history and scheduled-report configuration.

Revision ID: 0016_reporting_foundation
Revises: 0015_notification_audience_roles
"""

from alembic import op
import sqlalchemy as sa


revision = "0016_reporting_foundation"
down_revision = "0015_notification_audience_roles"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "report_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("generated_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("report_type", sa.String(length=50), nullable=False),
        sa.Column("report_name", sa.String(length=160), nullable=False),
        sa.Column("filters", sa.JSON(), nullable=False),
        sa.Column("export_format", sa.String(length=10), nullable=False, server_default="VIEW"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="COMPLETED"),
        sa.Column("failure_reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_report_history_company_created", "report_history", ["company_id", "created_at"])
    op.create_index("ix_report_history_company_type", "report_history", ["company_id", "report_type"])
    op.create_table(
        "scheduled_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("report_type", sa.String(length=50), nullable=False),
        sa.Column("report_name", sa.String(length=160), nullable=False),
        sa.Column("filters", sa.JSON(), nullable=False),
        sa.Column("frequency", sa.String(length=20), nullable=False),
        sa.Column("execution_time", sa.String(length=5), nullable=False),
        sa.Column("recipients", sa.JSON(), nullable=False),
        sa.Column("export_format", sa.String(length=10), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_status", sa.String(length=30), nullable=True),
        sa.Column("last_error", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_scheduled_reports_company_active", "scheduled_reports", ["company_id", "is_active"])


def downgrade():
    op.drop_index("ix_scheduled_reports_company_active", table_name="scheduled_reports")
    op.drop_table("scheduled_reports")
    op.drop_index("ix_report_history_company_type", table_name="report_history")
    op.drop_index("ix_report_history_company_created", table_name="report_history")
    op.drop_table("report_history")
