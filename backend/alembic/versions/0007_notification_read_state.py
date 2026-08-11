"""Add read state to notifications."""
from alembic import op
import sqlalchemy as sa

revision = "0007_notification_read_state"
down_revision = "0006_demand_forecasts"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("notifications", sa.Column("is_read", sa.Integer(), nullable=False, server_default="0"))


def downgrade():
    op.drop_column("notifications", "is_read")
