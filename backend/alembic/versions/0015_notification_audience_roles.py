"""Add role-aware notification delivery.

Revision ID: 0015_notification_audience_roles
Revises: 0014_notification_alert_management
"""
from alembic import op
import sqlalchemy as sa

revision = "0015_notification_audience_roles"
down_revision = "0014_notification_alert_management"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("notifications", sa.Column("audience_roles", sa.String(length=160), nullable=True))


def downgrade():
    op.drop_column("notifications", "audience_roles")
