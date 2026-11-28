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


def test_migration_0002_reconciles_pre_existing_railway_schema():
    """Simulate exact Railway production state:
    - scans (without xp_awarded_at) and users exist.
    - gamification_profiles exists with live user progress.
    - notifications exists with live alerts, but missing ck_notifications_owner.
    - alembic_version is at 0001_initial_schema_and_users.

    Verifies:
    1. Upgrade head adds scans.xp_awarded_at and backfills created_at.
    2. Pre-existing gamification and notification records are 100% preserved.
    3. Missing check constraint ck_notifications_owner is added.
    4. Downgrade does NOT drop gamification_profiles or notifications tables.
    """
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        # 1. Setup scans table without xp_awarded_at
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
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );
        """))
        # 2. Setup users table
        conn.execute(text("""
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                hashed_password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );
        """))
        # 3. Setup pre-existing gamification_profiles table (from Base.metadata.create_all)
        conn.execute(text("""
            CREATE TABLE gamification_profiles (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) UNIQUE,
                session_id VARCHAR(36) UNIQUE,
                base_scan_xp INTEGER NOT NULL DEFAULT 0,
                total_xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                scans_completed INTEGER NOT NULL DEFAULT 0,
                threats_neutralized INTEGER NOT NULL DEFAULT 0,
                daily_streak INTEGER NOT NULL DEFAULT 0,
                last_active_date TIMESTAMP,
                is_leaderboard_visible BOOLEAN NOT NULL DEFAULT 0,
                pseudonym VARCHAR(50) NOT NULL,
                unlocked_badges TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                CONSTRAINT ck_gamification_profile_owner CHECK (
                    (user_id IS NOT NULL AND session_id IS NULL) OR (user_id IS NULL AND session_id IS NOT NULL)
                )
            );
        """))
        # 4. Setup pre-existing notifications table WITHOUT check constraint
        conn.execute(text("""
            CREATE TABLE notifications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                session_id VARCHAR(36),
                title VARCHAR(150) NOT NULL,
                message VARCHAR(500) NOT NULL,
                type VARCHAR(30) NOT NULL,
                read BOOLEAN NOT NULL DEFAULT 0,
                link VARCHAR(255),
                created_at TIMESTAMP NOT NULL
            );
        """))
        # 5. Initialize alembic_version at 0001
        conn.execute(text("""
            CREATE TABLE alembic_version (
                version_num VARCHAR(32) NOT NULL PRIMARY KEY
            );
        """))
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001_initial_schema_and_users')"))

        # Insert live records
        u_id = str(uuid.uuid4())
        s_id = str(uuid.uuid4())
        gp_id = str(uuid.uuid4())
        notif_id = str(uuid.uuid4())
        scan_id = str(uuid.uuid4())
        now = "2026-11-20T10:00:00"

        conn.execute(
            text("INSERT INTO users (id, email, hashed_password, full_name, created_at, updated_at) VALUES (:id, 'user@test.com', 'h', 'User', :now, :now)"),
            {"id": u_id, "now": now},
        )
        conn.execute(
            text("""
                INSERT INTO scans (id, user_id, target_type, target_content, overall_risk_score, verdict, risk_level, created_at, updated_at)
                VALUES (:id, :uid, 'url', 'https://test.com', 90.0, 'malicious', 'high', :now, :now)
            """),
            {"id": scan_id, "uid": u_id, "now": now},
        )
        conn.execute(
            text("""
                INSERT INTO gamification_profiles (id, user_id, base_scan_xp, total_xp, level, scans_completed, pseudonym, unlocked_badges, created_at, updated_at)
                VALUES (:id, :uid, 100, 200, 1, 1, 'Analyst S-99', '{}', :now, :now)
            """),
            {"id": gp_id, "uid": u_id, "now": now},
        )
        conn.execute(
            text("""
                INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
                VALUES (:id, :uid, 'Threat Alert', 'Malicious scan', 'threat', 0, :now)
            """),
            {"id": notif_id, "uid": u_id, "now": now},
        )
        conn.commit()

        # Execute migration upgrade head
        cfg = get_test_alembic_config(conn)
        command.upgrade(cfg, "head")

        inspector = sa.inspect(conn)
        # Check xp_awarded_at added and backfilled
        scans_cols = {c["name"] for c in inspector.get_columns("scans")}
        assert "xp_awarded_at" in scans_cols
        res = conn.execute(text("SELECT xp_awarded_at FROM scans WHERE id = :id"), {"id": scan_id}).fetchone()
        assert res[0] is not None, "Historical scan must be backfilled with non-null xp_awarded_at"

        # Check gamification_profiles data preserved
        gp_res = conn.execute(text("SELECT base_scan_xp, total_xp, pseudonym FROM gamification_profiles WHERE id = :id"), {"id": gp_id}).fetchone()
        assert gp_res[0] == 100
        assert gp_res[1] == 200
        assert gp_res[2] == "Analyst S-99"

        # Check notifications data preserved
        notif_res = conn.execute(text("SELECT title, type FROM notifications WHERE id = :id"), {"id": notif_id}).fetchone()
        assert notif_res[0] == "Threat Alert"
        assert notif_res[1] == "threat"

        # Check constraint added on notifications
        notif_constraints = {c["name"] for c in inspector.get_check_constraints("notifications")}
        assert "ck_notifications_owner" in notif_constraints

        # Check revision updated
        rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        assert rev == "0002_gamification_notifications"

        # Check gamification_profiles index reconciled
        gp_indexes = {idx["name"] for idx in inspector.get_indexes("gamification_profiles")}
        assert "ix_gamification_profiles_total_xp" in gp_indexes, "ix_gamification_profiles_total_xp must be created"
        assert "ix_gamification_profiles_leaderboard" in gp_indexes

        # Check downgrade to 0001 DOES NOT drop gamification_profiles or notifications
        command.downgrade(cfg, "0001_initial_schema_and_users")

        post_down_inspector = sa.inspect(conn)
        post_down_tables = set(post_down_inspector.get_table_names())
        assert "gamification_profiles" in post_down_tables, "gamification_profiles must NOT be dropped on downgrade"
        assert "notifications" in post_down_tables, "notifications must NOT be dropped on downgrade"
        assert "scans" in post_down_tables
        assert "users" in post_down_tables

        # Check constraint remains preserved on notifications table
        post_down_constraints = {c["name"] for c in post_down_inspector.get_check_constraints("notifications")}
        assert "ck_notifications_owner" in post_down_constraints, "ck_notifications_owner must survive downgrade"

        # Check data remains completely intact after downgrade
        assert conn.execute(text("SELECT count(*) FROM gamification_profiles")).scalar() == 1
        assert conn.execute(text("SELECT count(*) FROM notifications")).scalar() == 1
        assert conn.execute(text("SELECT count(*) FROM scans")).scalar() == 1


def test_migration_0002_fails_safely_when_invalid_notification_owners_exist():
    """If notifications table contains rows with both user_id and session_id NULL,
    migration 0002 must fail clearly with RuntimeError rather than deleting or modifying data.
    """
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE scans (
                id VARCHAR(36) PRIMARY KEY,
                created_at TIMESTAMP NOT NULL
            );
        """))
        conn.execute(text("""
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY
            );
        """))
        conn.execute(text("""
            CREATE TABLE notifications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                session_id VARCHAR(36),
                title VARCHAR(150) NOT NULL,
                message VARCHAR(500) NOT NULL,
                type VARCHAR(30) NOT NULL,
                read BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL
            );
        """))
        conn.execute(text("""
            CREATE TABLE alembic_version (
                version_num VARCHAR(32) NOT NULL PRIMARY KEY
            );
        """))
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001_initial_schema_and_users')"))

        # Insert invalid notification with both user_id and session_id NULL
        now = "2026-11-20T10:00:00"
        bad_notif_id = str(uuid.uuid4())
        conn.execute(
            text("INSERT INTO notifications (id, user_id, session_id, title, message, type, created_at) VALUES (:id, NULL, NULL, 'Bad', 'Msg', 'alert', :now)"),
            {"id": bad_notif_id, "now": now},
        )
        conn.commit()

        cfg = get_test_alembic_config(conn)
        with pytest.raises(RuntimeError, match="found 1 notification record.*both user_id and session_id are NULL"):
            command.upgrade(cfg, "head")

        # Verify invalid record was NOT deleted or modified
        bad_record = conn.execute(text("SELECT id, title FROM notifications WHERE id = :id"), {"id": bad_notif_id}).fetchone()
        assert bad_record is not None
        assert bad_record[0] == bad_notif_id

        # Verify NO DDL or DML was executed: scans table was not modified
        post_inspector = sa.inspect(conn)
        scans_cols = {c["name"] for c in post_inspector.get_columns("scans")}
        assert "xp_awarded_at" not in scans_cols, "Preflight failure must prevent DDL on scans"

        # Verify check constraint was not created
        notif_constraints = {c["name"] for c in post_inspector.get_check_constraints("notifications")}
        assert "ck_notifications_owner" not in notif_constraints

        # Verify revision was not updated
        rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        assert rev == "0001_initial_schema_and_users"


def test_migration_0002_fails_safely_when_invalid_gamification_profile_owners_exist():
    """Verify that if gamification_profiles contains records violating ownership
    (both user_id and session_id NULL, or both non-NULL), preflight aborts before ANY DDL/DML,
    leaving scans and gamification_profiles completely unchanged.
    """
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE scans (id VARCHAR(36) PRIMARY KEY, created_at TIMESTAMP NOT NULL);
        """))
        conn.execute(text("""
            CREATE TABLE users (id VARCHAR(36) PRIMARY KEY);
        """))
        conn.execute(text("""
            CREATE TABLE gamification_profiles (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                session_id VARCHAR(36),
                base_scan_xp INTEGER NOT NULL DEFAULT 0,
                total_xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                pseudonym VARCHAR(50) NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );
        """))
        conn.execute(text("""
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
        """))
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001_initial_schema_and_users')"))

        # Insert invalid profile with BOTH user_id and session_id populated (ambiguous owner)
        bad_gp_id = str(uuid.uuid4())
        u_id = str(uuid.uuid4())
        s_id = str(uuid.uuid4())
        now = "2026-11-20T10:00:00"
        conn.execute(
            text("""
                INSERT INTO gamification_profiles (id, user_id, session_id, pseudonym, created_at, updated_at)
                VALUES (:id, :uid, :sid, 'DoubleOwner', :now, :now)
            """),
            {"id": bad_gp_id, "uid": u_id, "sid": s_id, "now": now},
        )
        conn.commit()

        cfg = get_test_alembic_config(conn)
        with pytest.raises(RuntimeError, match="found 1 gamification profile.*invalid ownership"):
            command.upgrade(cfg, "head")

        # Verify invalid record is 100% intact
        bad_row = conn.execute(
            text("SELECT id, pseudonym FROM gamification_profiles WHERE id = :id"),
            {"id": bad_gp_id},
        ).fetchone()
        assert bad_row is not None
        assert bad_row[0] == bad_gp_id

        # Verify NO DDL/DML was executed on scans
        post_inspector = sa.inspect(conn)
        scans_cols = {c["name"] for c in post_inspector.get_columns("scans")}
        assert "xp_awarded_at" not in scans_cols, "Preflight failure must prevent DDL on scans"

        # Verify constraint was not added
        gp_constraints = {c["name"] for c in post_inspector.get_check_constraints("gamification_profiles")}
        assert "ck_gamification_profile_owner" not in gp_constraints

        # Verify revision was not bumped
        rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        assert rev == "0001_initial_schema_and_users"


def test_migration_0002_pre_existing_check_constraint_survives_downgrade():
    """Verify that if ck_notifications_owner pre-existed migration 0002,
    downgrading from 0002 does NOT drop it.
    """
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        # Pre-existing tables from revision 0001
        conn.execute(text("""
            CREATE TABLE scans (
                id VARCHAR(36) PRIMARY KEY,
                created_at TIMESTAMP NOT NULL
            );
        """))
        conn.execute(text("""
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY
            );
        """))
        # Pre-existing notifications table that ALREADY has ck_notifications_owner
        conn.execute(text("""
            CREATE TABLE notifications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                session_id VARCHAR(36),
                title VARCHAR(150) NOT NULL,
                message VARCHAR(500) NOT NULL,
                type VARCHAR(30) NOT NULL,
                read BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL,
                CONSTRAINT ck_notifications_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
            );
        """))
        conn.execute(text("""
            CREATE TABLE alembic_version (
                version_num VARCHAR(32) NOT NULL PRIMARY KEY
            );
        """))
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001_initial_schema_and_users')"))
        conn.commit()

        # Verify constraint exists prior to upgrade
        pre_inspector = sa.inspect(conn)
        pre_constraints = {c["name"] for c in pre_inspector.get_check_constraints("notifications")}
        assert "ck_notifications_owner" in pre_constraints, "Constraint must exist before migration"

        cfg = get_test_alembic_config(conn)

        # Upgrade to head (0002)
        command.upgrade(cfg, "head")

        mid_inspector = sa.inspect(conn)
        mid_constraints = {c["name"] for c in mid_inspector.get_check_constraints("notifications")}
        assert "ck_notifications_owner" in mid_constraints, "Constraint must exist after upgrade"

        # Downgrade back to 0001
        command.downgrade(cfg, "0001_initial_schema_and_users")

        post_inspector = sa.inspect(conn)
        post_constraints = {c["name"] for c in post_inspector.get_check_constraints("notifications")}
        assert "ck_notifications_owner" in post_constraints, "Pre-existing ck_notifications_owner must survive downgrade"


def test_migration_0002_reconciles_missing_gamification_indexes():
    """Verify that if gamification_profiles exists without ix_gamification_profiles_total_xp,
    upgrade head creates the missing index.
    """
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE scans (id VARCHAR(36) PRIMARY KEY, created_at TIMESTAMP NOT NULL);
        """))
        conn.execute(text("""
            CREATE TABLE users (id VARCHAR(36) PRIMARY KEY);
        """))
        conn.execute(text("""
            CREATE TABLE gamification_profiles (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) UNIQUE,
                session_id VARCHAR(36) UNIQUE,
                base_scan_xp INTEGER NOT NULL DEFAULT 0,
                total_xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                scans_completed INTEGER NOT NULL DEFAULT 0,
                threats_neutralized INTEGER NOT NULL DEFAULT 0,
                daily_streak INTEGER NOT NULL DEFAULT 0,
                last_active_date TIMESTAMP,
                is_leaderboard_visible BOOLEAN NOT NULL DEFAULT 0,
                pseudonym VARCHAR(50) NOT NULL,
                unlocked_badges TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );
        """))
        conn.execute(text("""
            CREATE TABLE notifications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                session_id VARCHAR(36),
                title VARCHAR(150) NOT NULL,
                message VARCHAR(500) NOT NULL,
                type VARCHAR(30) NOT NULL,
                read BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL
            );
        """))
        conn.execute(text("""
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
        """))
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001_initial_schema_and_users')"))
        conn.commit()

        # Before upgrade: index does not exist
        pre_inspector = sa.inspect(conn)
        pre_indexes = {idx["name"] for idx in pre_inspector.get_indexes("gamification_profiles")}
        assert "ix_gamification_profiles_total_xp" not in pre_indexes

        cfg = get_test_alembic_config(conn)
        command.upgrade(cfg, "head")

        post_inspector = sa.inspect(conn)
        post_indexes = {idx["name"] for idx in post_inspector.get_indexes("gamification_profiles")}
        assert "ix_gamification_profiles_total_xp" in post_indexes, "ix_gamification_profiles_total_xp must be created"
        assert "ix_gamification_profiles_leaderboard" in post_indexes


def test_migration_0002_fails_when_populated_notifications_missing_required_columns():
    """Verify that if a populated notifications table is missing required columns (title, message, or type),
    migration 0002 fails safely with a clear RuntimeError before schema modification, preventing misleading backfills.
    """
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE scans (id VARCHAR(36) PRIMARY KEY, created_at TIMESTAMP NOT NULL);
        """))
        conn.execute(text("""
            CREATE TABLE users (id VARCHAR(36) PRIMARY KEY);
        """))
        # Populated notifications table missing 'title' and 'message'
        conn.execute(text("""
            CREATE TABLE notifications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                type VARCHAR(30) NOT NULL,
                read BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL
            );
        """))
        conn.execute(text("""
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
        """))
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001_initial_schema_and_users')"))

        # Populate with 1 live record
        notif_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        now = "2026-11-20T10:00:00"
        conn.execute(
            text("INSERT INTO notifications (id, user_id, type, read, created_at) VALUES (:id, :uid, 'system', 0, :now)"),
            {"id": notif_id, "uid": user_id, "now": now},
        )
        conn.commit()

        cfg = get_test_alembic_config(conn)
        with pytest.raises(RuntimeError, match="Cannot safely add missing required notification column.*Safe backfilling cannot be guaranteed"):
            command.upgrade(cfg, "head")

        # Verify live record remains intact
        row = conn.execute(text("SELECT id, type FROM notifications WHERE id = :id"), {"id": notif_id}).fetchone()
        assert row is not None
        assert row[0] == notif_id

        # Verify NO DDL or DML was executed: scans and notifications tables were not altered
        post_inspector = sa.inspect(conn)
        scans_cols = {c["name"] for c in post_inspector.get_columns("scans")}
        assert "xp_awarded_at" not in scans_cols, "Preflight failure must prevent DDL on scans"

        # Verify revision was not updated
        rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        assert rev == "0001_initial_schema_and_users"


def test_migration_0002_adds_missing_notification_columns_on_empty_table():
    """Verify that on an empty notifications table, missing required columns (title, message, type)
    are added cleanly with NOT NULL and without error.
    """
    engine = create_engine("sqlite:///:memory:")

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE scans (id VARCHAR(36) PRIMARY KEY, created_at TIMESTAMP NOT NULL);
        """))
        conn.execute(text("""
            CREATE TABLE users (id VARCHAR(36) PRIMARY KEY);
        """))
        # Empty notifications table missing 'title', 'message', 'type'
        conn.execute(text("""
            CREATE TABLE notifications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                session_id VARCHAR(36),
                created_at TIMESTAMP NOT NULL
            );
        """))
        conn.execute(text("""
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
        """))
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001_initial_schema_and_users')"))
        conn.commit()

        cfg = get_test_alembic_config(conn)
        command.upgrade(cfg, "head")

        inspector = sa.inspect(conn)
        cols = {c["name"] for c in inspector.get_columns("notifications")}
        assert {"title", "message", "type", "read", "link"}.issubset(cols)
