"""Add persisted data-import batches and row errors.

Revision ID: 0012_data_import_history
Revises: 0011_product_replenishment_settings
"""
from alembic import op
import sqlalchemy as sa

revision = "0012_data_import_history"
down_revision = "0011_product_replenishment_settings"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "import_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("import_type", sa.String(length=20), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("source_data", sa.Text(), nullable=False),
        sa.Column("total_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("successful_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_import_batches_company_id", "import_batches", ["company_id"])
    op.create_table(
        "import_errors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("import_id", sa.Integer(), sa.ForeignKey("import_batches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("row_data", sa.Text(), nullable=True),
        sa.Column("error_type", sa.String(length=30), nullable=False),
        sa.Column("error_message", sa.String(length=1000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_import_errors_import_id", "import_errors", ["import_id"])


def downgrade():
    op.drop_index("ix_import_errors_import_id", table_name="import_errors")
    op.drop_table("import_errors")
    op.drop_index("ix_import_batches_company_id", table_name="import_batches")
    op.drop_table("import_batches")
