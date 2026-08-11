"""Link sales to customers and add payment metadata."""

from alembic import op
import sqlalchemy as sa


revision = "0008_sale_customer_payment"
down_revision = "0007_notification_read_state"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("sales", sa.Column("customer_id", sa.Integer(), nullable=True))
    op.add_column(
        "sales",
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="PAID"),
    )
    op.add_column("sales", sa.Column("notes", sa.String(length=1000), nullable=True))
    op.execute(
        """
        UPDATE sales
        SET customer_id = customers.id
        FROM customers
        WHERE customers.company_id = sales.company_id
          AND customers.full_name = sales.customer_name
        """
    )
    op.create_index("ix_sales_customer_id", "sales", ["customer_id"])
    op.create_foreign_key("fk_sales_customer_id", "sales", "customers", ["customer_id"], ["id"], ondelete="RESTRICT")


def downgrade():
    op.drop_constraint("fk_sales_customer_id", "sales", type_="foreignkey")
    op.drop_index("ix_sales_customer_id", table_name="sales")
    op.drop_column("sales", "notes")
    op.drop_column("sales", "payment_status")
    op.drop_column("sales", "customer_id")
