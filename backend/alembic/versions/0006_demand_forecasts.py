"""Add demand forecasting tables."""

import sqlalchemy as sa

from alembic import op

revision = "0006_demand_forecasts"
down_revision = "0005_customers"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "demand_forecasts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "company_id",
            sa.Integer(),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.Integer(),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("forecast_period", sa.Integer(), nullable=False),
        sa.Column("predicted_demand", sa.Float(), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "company_id",
            "product_id",
            "forecast_period",
            name="uq_forecast_company_product_period",
        ),
    )
    op.create_table(
        "forecast_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "forecast_id",
            sa.Integer(),
            sa.ForeignKey("demand_forecasts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("historical_sales", sa.Float(), nullable=False),
        sa.Column("prediction", sa.Float(), nullable=False),
        sa.Column("accuracy", sa.Float()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade():
    op.drop_table("forecast_history")
    op.drop_table("demand_forecasts")
