
"""Safe initial schema migration: preserves existing scans table and provisions users table.

Revision ID: 0001_initial_schema_and_users
Revises: None
Create Date: 2026-11-13
"""
from typing import Sequence, Union
import logging

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

logger = logging.getLogger("alembic.runtime.migration")

revision: str = "0001_initial_schema_and_users"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def create_users_table() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_created_at", "users", ["created_at"])


def upgrade() -> None:
    # Offline mode is used only to preview SQL for the known Railway schema.
    # Railway already has the scans table, so preview only the users table.
    if context.is_offline_mode():
        logger.info("Offline SQL preview: generating users table only.")
        create_users_table()
        return

    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # Preserve existing scans table and all its records.
    if "scans" not in existing_tables:
        logger.info("Creating scans table for fresh database...")
        op.create_table(
            "scans",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=True),
            sa.Column("target_type", sa.String(length=20), nullable=False),
            sa.Column("target_content", sa.Text(), nullable=False),
            sa.Column("overall_risk_score", sa.Float(), nullable=False),
            sa.Column("verdict", sa.String(length=20), nullable=False),
            sa.Column("risk_level", sa.String(length=20), nullable=False),
            sa.Column("summary_en", sa.Text(), nullable=True),
            sa.Column("summary_ur", sa.Text(), nullable=True),
            sa.Column("recommendations_en", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True),
            sa.Column("recommendations_ur", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True),
            sa.Column("agent_findings", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_scans_id", "scans", ["id"])
        op.create_index("ix_scans_user_id", "scans", ["user_id"])
        op.create_index("ix_scans_target_type", "scans", ["target_type"])
        op.create_index("ix_scans_verdict", "scans", ["verdict"])
        op.create_index("ix_scans_risk_level", "scans", ["risk_level"])
        op.create_index("ix_scans_created_at", "scans", ["created_at"])
        op.create_index("ix_scans_user_created_at", "scans", ["user_id", "created_at"])
    else:
        logger.info("Existing scans table found; preserving it.")

    if "users" not in existing_tables:
        logger.info("Creating users table...")
        create_users_table()
    else:
        logger.info("Existing users table found; skipping creation.")


def downgrade() -> None:
    # Offline downgrade preview targets the users table only.
    if context.is_offline_mode():
        op.drop_table("users")
        return

    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # Never drop scans or its records.
    if "users" in existing_tables:
        logger.info("Dropping users table...")
        op.drop_table("users")
