"""Add per-product replenishment settings.

Revision ID: 0011_product_replenishment_settings
Revises: 0010_product_supplier
"""

from alembic import op
import sqlalchemy as sa


revision = "0011_product_replenishment_settings"
down_revision = "0010_product_supplier"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "products",
        sa.Column("lead_time_days", sa.Integer(), nullable=False, server_default="7"),
    )
    op.add_column(
        "products",
        sa.Column("safety_stock_days", sa.Integer(), nullable=False, server_default="3"),
    )
    op.alter_column("products", "lead_time_days", server_default=None)
    op.alter_column("products", "safety_stock_days", server_default=None)


def downgrade():
    op.drop_column("products", "safety_stock_days")
    op.drop_column("products", "lead_time_days")
