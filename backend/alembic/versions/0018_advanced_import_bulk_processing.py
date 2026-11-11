"""Extend import batches with Task 17 progress metadata.

Revision ID: 0018_advanced_import_bulk_processing
Revises: 0017_data_quality_reconciliation
"""

from alembic import op
import sqlalchemy as sa

revision = "0018_advanced_import_bulk_processing"
down_revision = "0017_data_quality_reconciliation"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("import_batches", sa.Column("skipped_records", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("import_batches", sa.Column("processed_records", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("import_batches", sa.Column("progress_percent", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("import_batches", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("import_batches", sa.Column("processing_duration_ms", sa.Integer(), nullable=True))
    op.create_index("ix_import_batches_company_status", "import_batches", ["company_id", "status"])


def downgrade():
    op.drop_index("ix_import_batches_company_status", table_name="import_batches")
    for column in ["processing_duration_ms", "started_at", "progress_percent", "processed_records", "skipped_records"]:
        op.drop_column("import_batches", column)
