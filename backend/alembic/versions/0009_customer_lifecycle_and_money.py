"""Customer lifecycle fields and precise monetary storage."""

from alembic import op
import sqlalchemy as sa


revision = "0009_customer_lifecycle_and_money"
down_revision = "0008_sale_customer_payment"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("customers", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("customers", sa.Column("last_name", sa.String(100), nullable=True))
    op.add_column("customers", sa.Column("postal_code", sa.String(20), nullable=True))
    op.add_column("customers", sa.Column("is_deleted", sa.Integer(), nullable=False, server_default="0"))
    op.create_index("ix_customers_is_deleted", "customers", ["is_deleted"])
    op.execute("UPDATE customers SET first_name = split_part(full_name, ' ', 1), last_name = NULLIF(substr(full_name, length(split_part(full_name, ' ', 1)) + 2), '')")
    for table, column in [
        ("products", "unit_price"), ("products", "cost_price"),
        ("sales", "total_amount"), ("sale_items", "unit_price"),
        ("sale_items", "discount"), ("sale_items", "tax"), ("sale_items", "total"),
        ("customer_purchase_summary", "total_revenue"),
        ("customer_purchase_summary", "average_order_value"),
    ]:
        op.alter_column(table, column, type_=sa.Numeric(14, 2), postgresql_using=f"{column}::numeric(14,2)")


def downgrade():
    for table, column in [
        ("customer_purchase_summary", "average_order_value"), ("customer_purchase_summary", "total_revenue"),
        ("sale_items", "total"), ("sale_items", "tax"), ("sale_items", "discount"),
        ("sale_items", "unit_price"), ("sales", "total_amount"),
        ("products", "cost_price"), ("products", "unit_price"),
    ]:
        op.alter_column(table, column, type_=sa.Float(), postgresql_using=f"{column}::double precision")
    op.drop_index("ix_customers_is_deleted", table_name="customers")
    op.drop_column("customers", "is_deleted")
    op.drop_column("customers", "postal_code")
    op.drop_column("customers", "last_name")
    op.drop_column("customers", "first_name")
