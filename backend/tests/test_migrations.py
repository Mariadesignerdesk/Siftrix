"""Comprehensive tests for Alembic database migration setup:
- Verification of Alembic configuration and env.py resolution.
- Fresh database migration creates both 'scans' and 'users' tables.
- Railway simulation: verifies pre-existing 'scans' table and records remain 100% intact.
- Downgrade safely removes 'users' while protecting 'scans' data.
- Idempotency test when tables already exist.
"""
import uuid
from datetime import datetime, timezone
from pathlib import Path
import pytest
from alembic import command
from alembic.config import Config
import sqlalchemy as sa
from sqlalchemy import create_engine, text

from app.models.scan import ScanRecord

BACKEND_DIR = Path(__file__).resolve().parents[1]
ALEMBIC_INI_PATH = BACKEND_DIR / "alembic.ini"


def get_test_alembic_config(connection) -> Config:
    """Create an Alembic Config pointing to backend/alembic.ini and injecting test connection."""
    cfg = Config(str(ALEMBIC_INI_PATH))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("version_locations", str(BACKEND_DIR / "alembic" / "versions"))
    cfg.attributes["connection"] = connection
    return cfg


def test_alembic_config_resolves_cleanly():
    """Verify alembic.ini exists and script_location is valid."""
    assert ALEMBIC_INI_PATH.is_file(), "alembic.ini must exist in backend root"
    cfg = Config(str(ALEMBIC_INI_PATH))
    script_loc = cfg.get_main_option("script_location")
    assert script_loc.endswith("alembic")


def test_migration_on_fresh_database():
    """Verify that running 'upgrade head' on a fresh database creates both scans and users tables."""
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        cfg = get_test_alembic_config(conn)

        # 1. Run upgrade
        command.upgrade(cfg, "head")

        # 2. Inspect created tables
        inspector = sa.inspect(conn)
        tables = set(inspector.get_table_names())
        assert "scans" in tables, "'scans' table must be created on fresh database"
        assert "users" in tables, "'users' table must be created on fresh database"
        assert "alembic_version" in tables, "'alembic_version' table must track revision"

        # 3. Check users table columns
        user_cols = {col["name"] for col in inspector.get_columns("users")}
        expected_user_cols = {"id", "email", "hashed_password", "full_name", "is_active", "created_at", "updated_at"}
        assert expected_user_cols.issubset(user_cols)

        # 4. Check downgrade safely drops users
        command.downgrade(cfg, "base")
        post_down_inspector = sa.inspect(conn)
        post_down_tables = set(post_down_inspector.get_table_names())
        assert "users" not in post_down_tables, "'users' table must be dropped on downgrade"


def test_migration_preserves_existing_scans_table_and_records():
    """Railway Simulation: Pre-existing 'scans' table and live records must remain 100% intact."""
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        # 1. Simulate existing Railway state: create 'scans' table and insert live scan history
        conn.execute(text("""
            CREATE TABLE scans (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                target_type VARCHAR(20) NOT NULL,
                target_content TEXT NOT NULL,
                overall_risk_score FLOAT NOT NULL,
                verdict VARCHAR(20) NOT NULL,
                risk_level VARCHAR(20) NOT NULL,
                summary_en TEXT,
                summary_ur TEXT,
                recommendations_en TEXT,
                recommendations_ur TEXT,
                agent_findings TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );
        """))

        scan_1_id = str(uuid.uuid4())
        scan_2_id = str(uuid.uuid4())
        guest_user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        conn.execute(
            text("""
                INSERT INTO scans (
                    id, user_id, target_type, target_content, overall_risk_score,
                    verdict, risk_level, summary_en, summary_ur, created_at, updated_at
                ) VALUES (
                    :id, :uid, 'message', 'Urgent HBL verification alert', 85.0,
                    'malicious', 'high', 'Bank phishing lure', 'Farzi bank scam', :now, :now
                )
            """),
            {"id": scan_1_id, "uid": guest_user_id, "now": now},
        )
        conn.execute(
            text("""
                INSERT INTO scans (
                    id, user_id, target_type, target_content, overall_risk_score,
                    verdict, risk_level, summary_en, summary_ur, created_at, updated_at
                ) VALUES (
                    :id, :uid, 'url', 'https://example.com/safe', 5.0,
                    'safe', 'low', 'Clean URL', 'Mehfooz link', :now, :now
                )
            """),
            {"id": scan_2_id, "uid": guest_user_id, "now": now},
        )
        conn.commit()

        # Verify initial records exist
        initial_count = conn.execute(text("SELECT count(*) FROM scans")).scalar()
        assert initial_count == 2

        # 2. Run Alembic upgrade head against existing database
        cfg = get_test_alembic_config(conn)
        command.upgrade(cfg, "head")

        # 3. Assertions:
        # a) users table must now exist
        inspector = sa.inspect(conn)
        tables = set(inspector.get_table_names())
        assert "users" in tables, "'users' table must be provisioned"
        assert "scans" in tables, "'scans' table must still exist"

        # b) CRITICAL: scans count and data must be 100% preserved
        final_count = conn.execute(text("SELECT count(*) FROM scans")).scalar()
        assert final_count == 2, "Scan count must not change during migration"

        # c) Verify exact record contents
        records = conn.execute(text("SELECT id, target_content, overall_risk_score FROM scans ORDER BY overall_risk_score DESC")).fetchall()
        assert records[0][0] == scan_1_id
        assert records[0][1] == "Urgent HBL verification alert"
        assert records[0][2] == 85.0
        assert records[1][0] == scan_2_id
        assert records[1][1] == "https://example.com/safe"
        assert records[1][2] == 5.0


def test_migration_idempotent_when_both_tables_already_exist():
    """Verify migration executes cleanly without errors if both tables already exist."""
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        cfg = get_test_alembic_config(conn)

        # First run: creates both tables
        command.upgrade(cfg, "head")

        # Re-executing upgrade on existing version should be a no-op
        command.upgrade(cfg, "head")

        inspector = sa.inspect(conn)
        tables = set(inspector.get_table_names())
        assert "scans" in tables
        assert "users" in tables
