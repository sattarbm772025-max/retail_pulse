"""Create Task 16 reconciliation metadata.

Revision ID: 0017_data_quality_reconciliation
Revises: 0016_reporting_foundation
"""

from alembic import op
import sqlalchemy as sa

revision = "0017_data_quality_reconciliation"
down_revision = "0016_reporting_foundation"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "reconciliation_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("triggered_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("records_checked", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("issues_detected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("issues_resolved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_checks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="RUNNING"),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("ix_reconciliation_runs_company_started", "reconciliation_runs", ["company_id", "started_at"])
    op.create_table(
        "data_quality_issues",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("issue_type", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("module", sa.String(length=50), nullable=False),
        sa.Column("record_type", sa.String(length=50), nullable=True),
        sa.Column("record_id", sa.Integer(), nullable=True),
        sa.Column("record_label", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("dedupe_key", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="OPEN"),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_detected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("previous_status", sa.String(length=30), nullable=True),
        sa.UniqueConstraint("company_id", "dedupe_key", name="uq_data_quality_company_dedupe"),
    )
    op.create_index("ix_dq_issues_company_status", "data_quality_issues", ["company_id", "status"])
    op.create_index("ix_dq_issues_company_detected", "data_quality_issues", ["company_id", "detected_at"])


def downgrade():
    op.drop_index("ix_dq_issues_company_detected", table_name="data_quality_issues")
    op.drop_index("ix_dq_issues_company_status", table_name="data_quality_issues")
    op.drop_table("data_quality_issues")
    op.drop_index("ix_reconciliation_runs_company_started", table_name="reconciliation_runs")
    op.drop_table("reconciliation_runs")
