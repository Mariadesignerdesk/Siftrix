"""Alembic migration: Safe reconciliation for Phase 7 gamification, notifications, and scan idempotency.

Revision ID: 0002_gamification_notifications
Revises: 0001_initial_schema_and_users
Create Date: 2026-11-26
"""
from typing import Sequence, Union
import logging

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

logger = logging.getLogger("alembic.runtime.migration")

revision: str = "0002_gamification_notifications"
down_revision: Union[str, None] = "0001_initial_schema_and_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    is_sqlite = conn.dialect.name == "sqlite"

    # =========================================================================
    # 0. READ-ONLY DATA-INTEGRITY PREFLIGHT CHECKS (Must run before ANY DDL/DML)
    # =========================================================================

    # Preflight Check 1: Missing required notification columns on populated tables
    if "notifications" in existing_tables:
        notif_cols_preflight = {col["name"] for col in inspector.get_columns("notifications")}
        missing_required_notif_cols = {"title", "message", "type"} - notif_cols_preflight
        if missing_required_notif_cols:
            notif_row_count = conn.execute(text("SELECT count(*) FROM notifications")).scalar() or 0
            if notif_row_count > 0:
                raise RuntimeError(
                    f"Cannot safely add missing required notification column(s) {sorted(missing_required_notif_cols)} "
                    f"to populated 'notifications' table ({notif_row_count} record(s) exist). "
                    "Safe backfilling cannot be guaranteed without inventing misleading user-facing content. "
                    "Migration halted to prevent data corruption."
                )

    # Preflight Check 2: Invalid gamification_profiles ownership records when owner constraint is missing
    if "gamification_profiles" in existing_tables:
        gp_constraints_preflight = {c["name"] for c in inspector.get_check_constraints("gamification_profiles")}
        if "ck_gamification_profile_owner" not in gp_constraints_preflight:
            gp_cols_preflight = {col["name"] for col in inspector.get_columns("gamification_profiles")}
            if "user_id" in gp_cols_preflight and "session_id" in gp_cols_preflight:
                invalid_gp_count = conn.execute(
                    text("""
                        SELECT count(*) FROM gamification_profiles
                        WHERE (user_id IS NULL AND session_id IS NULL)
                           OR (user_id IS NOT NULL AND session_id IS NOT NULL)
                    """)
                ).scalar() or 0
                if invalid_gp_count > 0:
                    raise RuntimeError(
                        f"Cannot add check constraint 'ck_gamification_profile_owner': found {invalid_gp_count} "
                        "gamification profile(s) with invalid ownership. Migration halted to prevent data corruption."
                    )

    # Preflight Check 3: Invalid notifications ownership records when owner constraint is missing
    if "notifications" in existing_tables:
        notif_constraints_preflight = {c["name"] for c in inspector.get_check_constraints("notifications")}
        if "ck_notifications_owner" not in notif_constraints_preflight:
            notif_cols_preflight = {col["name"] for col in inspector.get_columns("notifications")}
            if "user_id" in notif_cols_preflight and "session_id" in notif_cols_preflight:
                invalid_notif_count = conn.execute(
                    text("SELECT count(*) FROM notifications WHERE user_id IS NULL AND session_id IS NULL")
                ).scalar() or 0
                if invalid_notif_count > 0:
                    raise RuntimeError(
                        f"Cannot add check constraint 'ck_notifications_owner': found {invalid_notif_count} "
                        "notification record(s) where both user_id and session_id are NULL. "
                        "Migration halted to prevent data loss."
                    )

    # =========================================================================
    # 1. Reconcile 'scans' table: add xp_awarded_at idempotency column & backfill
    # =========================================================================
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
            op.execute(text("UPDATE scans SET xp_awarded_at = created_at WHERE xp_awarded_at IS NULL"))
        else:
            # Column exists: ensure index exists
            indexes = {idx["name"] for idx in inspector.get_indexes("scans")}
            if "ix_scans_xp_awarded_at" not in indexes:
                op.create_index("ix_scans_xp_awarded_at", "scans", ["xp_awarded_at"])

    # =========================================================================
    # 2. Reconcile 'gamification_profiles' table
    # =========================================================================
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
    else:
        logger.info("Reconciling pre-existing gamification_profiles table...")
        gp_cols = {col["name"] for col in inspector.get_columns("gamification_profiles")}

        # Add any missing columns individually
        expected_gp_cols = {
            "base_scan_xp": sa.Column("base_scan_xp", sa.Integer(), nullable=False, server_default="0"),
            "total_xp": sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
            "level": sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
            "scans_completed": sa.Column("scans_completed", sa.Integer(), nullable=False, server_default="0"),
            "threats_neutralized": sa.Column("threats_neutralized", sa.Integer(), nullable=False, server_default="0"),
            "daily_streak": sa.Column("daily_streak", sa.Integer(), nullable=False, server_default="0"),
            "last_active_date": sa.Column("last_active_date", sa.DateTime(timezone=True), nullable=True),
            "is_leaderboard_visible": sa.Column("is_leaderboard_visible", sa.Boolean(), nullable=False, server_default=sa.false()),
            "pseudonym": sa.Column("pseudonym", sa.String(length=50), nullable=False, server_default="Analyst"),
            "unlocked_badges": sa.Column("unlocked_badges", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=False, server_default="{}"),
            "created_at": sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            "updated_at": sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        }
        for col_name, col_def in expected_gp_cols.items():
            if col_name not in gp_cols:
                logger.info(f"Adding missing column '{col_name}' to gamification_profiles...")
                op.add_column("gamification_profiles", col_def)

        # Check and create missing indexes on existing columns
        gp_indexes = {idx["name"] for idx in inspector.get_indexes("gamification_profiles")}
        updated_gp_cols = {col["name"] for col in inspector.get_columns("gamification_profiles")}
        if "ix_gamification_profiles_id" not in gp_indexes:
            op.create_index("ix_gamification_profiles_id", "gamification_profiles", ["id"])
        if "user_id" in updated_gp_cols and "ix_gamification_profiles_user_id" not in gp_indexes:
            op.create_index("ix_gamification_profiles_user_id", "gamification_profiles", ["user_id"], unique=True)
        if "session_id" in updated_gp_cols and "ix_gamification_profiles_session_id" not in gp_indexes:
            op.create_index("ix_gamification_profiles_session_id", "gamification_profiles", ["session_id"], unique=True)
        if "total_xp" in updated_gp_cols and "ix_gamification_profiles_total_xp" not in gp_indexes:
            op.create_index("ix_gamification_profiles_total_xp", "gamification_profiles", ["total_xp"])
        if {"total_xp", "scans_completed"}.issubset(updated_gp_cols) and "ix_gamification_profiles_leaderboard" not in gp_indexes:
            op.create_index("ix_gamification_profiles_leaderboard", "gamification_profiles", ["total_xp", "scans_completed"])

        # Reconcile check constraint ck_gamification_profile_owner (validated in preflight)
        gp_constraints = {c["name"] for c in inspector.get_check_constraints("gamification_profiles")}
        if "ck_gamification_profile_owner" not in gp_constraints:
            if is_sqlite:
                with op.batch_alter_table("gamification_profiles") as batch_op:
                    batch_op.create_check_constraint(
                        "ck_gamification_profile_owner",
                        "(user_id IS NOT NULL AND session_id IS NULL) OR (user_id IS NULL AND session_id IS NOT NULL)",
                    )
            else:
                op.create_check_constraint(
                    "ck_gamification_profile_owner",
                    "gamification_profiles",
                    "(user_id IS NOT NULL AND session_id IS NULL) OR (user_id IS NULL AND session_id IS NOT NULL)",
                )

    # =========================================================================
    # 3. Reconcile 'notifications' table
    # =========================================================================
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
    else:
        logger.info("Reconciling pre-existing notifications table...")
        notif_cols = {col["name"] for col in inspector.get_columns("notifications")}

        # Add any missing columns individually
        expected_notif_cols = {
            "title": sa.Column("title", sa.String(length=150), nullable=False),
            "message": sa.Column("message", sa.String(length=500), nullable=False),
            "type": sa.Column("type", sa.String(length=30), nullable=False),
            "read": sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false()),
            "link": sa.Column("link", sa.String(length=255), nullable=True),
            "created_at": sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        }
        for col_name, col_def in expected_notif_cols.items():
            if col_name not in notif_cols:
                logger.info(f"Adding missing column '{col_name}' to notifications...")
                op.add_column("notifications", col_def)

        # Check and create missing indexes on existing columns
        notif_indexes = {idx["name"] for idx in inspector.get_indexes("notifications")}
        updated_notif_cols = {col["name"] for col in inspector.get_columns("notifications")}
        if "ix_notifications_id" not in notif_indexes:
            op.create_index("ix_notifications_id", "notifications", ["id"])
        if "user_id" in updated_notif_cols and "ix_notifications_user_id" not in notif_indexes:
            op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
        if "session_id" in updated_notif_cols and "ix_notifications_session_id" not in notif_indexes:
            op.create_index("ix_notifications_session_id", "notifications", ["session_id"])
        if "created_at" in updated_notif_cols and "ix_notifications_created_at" not in notif_indexes:
            op.create_index("ix_notifications_created_at", "notifications", ["created_at"])
        if {"user_id", "read"}.issubset(updated_notif_cols) and "ix_notifications_user_read" not in notif_indexes:
            op.create_index("ix_notifications_user_read", "notifications", ["user_id", "read"])
        if {"session_id", "read"}.issubset(updated_notif_cols) and "ix_notifications_session_read" not in notif_indexes:
            op.create_index("ix_notifications_session_read", "notifications", ["session_id", "read"])

        # Reconcile check constraint ck_notifications_owner (validated in preflight)
        notif_constraints = {c["name"] for c in inspector.get_check_constraints("notifications")}
        if "ck_notifications_owner" not in notif_constraints:
            if is_sqlite:
                with op.batch_alter_table("notifications") as batch_op:
                    batch_op.create_check_constraint(
                        "ck_notifications_owner",
                        "user_id IS NOT NULL OR session_id IS NOT NULL",
                    )
            else:
                op.create_check_constraint(
                    "ck_notifications_owner",
                    "notifications",
                    "user_id IS NOT NULL OR session_id IS NOT NULL",
                )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    is_sqlite = conn.dialect.name == "sqlite"

    # Pre-existing production tables: NEVER drop gamification_profiles or notifications!
    logger.warning(
        "Downgrading 0002: preserving 'gamification_profiles' and 'notifications' tables to prevent production data loss."
    )

    # Conservative downgrade: preserve ck_notifications_owner to ensure data integrity
    # on pre-existing notifications table, avoiding dropping constraints that pre-existed 0002.
    if "notifications" in existing_tables:
        logger.info(
            "Downgrading 0002: preserving 'ck_notifications_owner' constraint to maintain data integrity on pre-existing notifications table."
        )

    # For scans.xp_awarded_at: preserve idempotency history if live records exist
    if "scans" in existing_tables:
        cols = {col["name"] for col in inspector.get_columns("scans")}
        if "xp_awarded_at" in cols:
            awarded_count = conn.execute(
                text("SELECT count(*) FROM scans WHERE xp_awarded_at IS NOT NULL")
            ).scalar() or 0
            if awarded_count > 0:
                logger.warning(
                    f"Downgrade 0002: preserved 'scans.xp_awarded_at' because {awarded_count} "
                    "scan records have idempotency timestamps."
                )
            else:
                op.drop_index("ix_scans_xp_awarded_at", table_name="scans")
                op.drop_column("scans", "xp_awarded_at")
