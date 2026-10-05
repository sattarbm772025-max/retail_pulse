"""Add centralized notification metadata.

Revision ID: 0014_notification_alert_management
Revises: 0013_audit_log_monitoring
"""
from alembic import op
import sqlalchemy as sa

revision = "0014_notification_alert_management"
down_revision = "0013_audit_log_monitoring"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("notifications", sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True))
    op.add_column("notifications", sa.Column("notification_type", sa.String(length=40), nullable=False, server_default="SYSTEM_ALERT"))
    op.add_column("notifications", sa.Column("title", sa.String(length=160), nullable=True))
    op.add_column("notifications", sa.Column("priority", sa.String(length=20), nullable=False, server_default="LOW"))
    op.add_column("notifications", sa.Column("resource_type", sa.String(length=50), nullable=True))
    op.add_column("notifications", sa.Column("resource_id", sa.Integer(), nullable=True))
    op.add_column("notifications", sa.Column("dedupe_key", sa.String(length=255), nullable=True))
    op.add_column("notifications", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("notifications", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_notification_type", "notifications", ["notification_type"])
    op.create_index("ix_notifications_priority", "notifications", ["priority"])
    op.create_index("ix_notifications_resource_id", "notifications", ["resource_id"])
    op.create_index("ix_notifications_dedupe_key", "notifications", ["dedupe_key"])
    op.create_index("ix_notifications_expires_at", "notifications", ["expires_at"])


def downgrade():
    for index in ["ix_notifications_expires_at", "ix_notifications_dedupe_key", "ix_notifications_resource_id", "ix_notifications_priority", "ix_notifications_notification_type", "ix_notifications_user_id"]:
        op.drop_index(index, table_name="notifications")
    for column in ["expires_at", "read_at", "dedupe_key", "resource_id", "resource_type", "priority", "title", "notification_type", "user_id"]:
        op.drop_column("notifications", column)
