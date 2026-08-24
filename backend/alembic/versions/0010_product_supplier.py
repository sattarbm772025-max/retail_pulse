"""Add optional supplier for replenishment filtering.

Revision ID: 0010_product_supplier
Revises: cb30e2835944
"""

from alembic import op
import sqlalchemy as sa


revision = "0010_product_supplier"
down_revision = "cb30e2835944"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("products", sa.Column("supplier", sa.String(150), nullable=True))
    op.create_index("ix_products_supplier", "products", ["supplier"])


def downgrade():
    op.drop_index("ix_products_supplier", table_name="products")
    op.drop_column("products", "supplier")
