"""Add customer management tables."""

import sqlalchemy as sa

from alembic import op

revision = "0005_customers"
down_revision = "0004_inventory_movements"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "company_id",
            sa.Integer(),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("customer_code", sa.String(30), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("date_of_birth", sa.Date()),
        sa.Column("gender", sa.String(30)),
        sa.Column("address", sa.String(500)),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("country", sa.String(100)),
        sa.Column("customer_type", sa.String(30), nullable=False),
        sa.Column("preferred_sales_channel", sa.String(30)),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("segment", sa.String(20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("company_id", "email", name="uq_customer_company_email"),
        sa.UniqueConstraint("company_id", "phone", name="uq_customer_company_phone"),
        sa.UniqueConstraint(
            "company_id", "customer_code", name="uq_customer_company_code"
        ),
    )
    op.create_index("ix_customers_company_id", "customers", ["company_id"])
    op.create_table(
        "customer_purchase_summary",
        sa.Column(
            "customer_id",
            sa.Integer(),
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("total_orders", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_revenue", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "quantity_purchased", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "average_order_value", sa.Float(), nullable=False, server_default="0"
        ),
        sa.Column("first_purchase_at", sa.DateTime(timezone=True)),
        sa.Column("last_purchase_at", sa.DateTime(timezone=True)),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_table(
        "customer_timeline",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "customer_id",
            sa.Integer(),
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("performed_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade():
    op.drop_table("customer_timeline")
    op.drop_table("customer_purchase_summary")
    op.drop_index("ix_customers_company_id", table_name="customers")
    op.drop_table("customers")
