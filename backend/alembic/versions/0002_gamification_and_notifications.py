"""Alembic migration: Add xp_awarded_at to scans and provision gamification_profiles and notifications tables.

Revision ID: 0002_gamification_and_notifications
Revises: 0001_initial_schema_and_users
Create Date: 2026-11-26
"""
from typing import Sequence, Union
import logging

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

logger = logging.getLogger("alembic.runtime.migration")

revision: str = "0002_gamification_and_notifications"
down_revision: Union[str, None] = "0001_initial_schema_and_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. Update scans table with xp_awarded_at column
    if "scans" in existing_tables:
        columns = {col["name"] for col in inspector.get_columns("scans")}
        if "xp_awarded_at" not in columns:
            logger.info("Adding xp_awarded_at column to scans table...")
            op.add_column(
                "scans",
                sa.Column("xp_awarded_at", sa.DateTime(timezone=True), nullable=True),
            )
            op.create_index("ix_scans_xp_awarded_at", "scans", ["xp_awarded_at"])
            # Close gate on historical scans so they do NOT receive retroactive base XP:
            logger.info("Closing historical scan gate (setting xp_awarded_at = created_at for pre-existing scans)...")
            op.execute("UPDATE scans SET xp_awarded_at = created_at WHERE xp_awarded_at IS NULL")

    # 2. Create gamification_profiles table
    if "gamification_profiles" not in existing_tables:
        logger.info("Creating gamification_profiles table...")
        op.create_table(
            "gamification_profiles",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("session_id", sa.Uuid(), nullable=True),
            sa.Column("base_scan_xp", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("scans_completed", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("threats_neutralized", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("daily_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_active_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_leaderboard_visible", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("pseudonym", sa.String(length=50), nullable=False),
            sa.Column(
                "unlocked_badges",
                sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
                nullable=False,
            ),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint(
                "(user_id IS NOT NULL AND session_id IS NULL) OR (user_id IS NULL AND session_id IS NOT NULL)",
                name="ck_gamification_profile_owner",
            ),
        )
        op.create_index("ix_gamification_profiles_id", "gamification_profiles", ["id"])
        op.create_index("ix_gamification_profiles_user_id", "gamification_profiles", ["user_id"], unique=True)
        op.create_index("ix_gamification_profiles_session_id", "gamification_profiles", ["session_id"], unique=True)
        op.create_index("ix_gamification_profiles_total_xp", "gamification_profiles", ["total_xp"])
        op.create_index(
            "ix_gamification_profiles_leaderboard",
            "gamification_profiles",
            ["total_xp", "scans_completed"],
        )

    # 3. Create notifications table
    if "notifications" not in existing_tables:
        logger.info("Creating notifications table...")
        op.create_table(
            "notifications",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("session_id", sa.Uuid(), nullable=True),
            sa.Column("title", sa.String(length=150), nullable=False),
            sa.Column("message", sa.String(length=500), nullable=False),
            sa.Column("type", sa.String(length=30), nullable=False),
            sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("link", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint(
                "user_id IS NOT NULL OR session_id IS NOT NULL",
                name="ck_notifications_owner",
            ),
        )
        op.create_index("ix_notifications_id", "notifications", ["id"])
        op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
        op.create_index("ix_notifications_session_id", "notifications", ["session_id"])
        op.create_index("ix_notifications_created_at", "notifications", ["created_at"])
        op.create_index("ix_notifications_user_read", "notifications", ["user_id", "read"])
        op.create_index("ix_notifications_session_read", "notifications", ["session_id", "read"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "notifications" in existing_tables:
        op.drop_table("notifications")

    if "gamification_profiles" in existing_tables:
        op.drop_table("gamification_profiles")

    if "scans" in existing_tables:
        columns = {col["name"] for col in inspector.get_columns("scans")}
        if "xp_awarded_at" in columns:
            op.drop_index("ix_scans_xp_awarded_at", table_name="scans")
            op.drop_column("scans", "xp_awarded_at")
