"""Automated tests for SIFTRIX Phase 7: Gamification, Rewards, Leaderboards, and Notifications."""
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.scan import ScanRecord
from app.models.gamification import GamificationProfile, NotificationRecord
from app.services.gamification_service import (
    award_scan_rewards,
    calculate_utc_daily_streak,
    calculate_level_info,
    calculate_tier,
    migrate_guest_gamification,
    get_or_create_profile,
    serialize_badges,
)
from app.core.security import create_access_token


# Shared in-memory SQLite fixture for test isolation
@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def registered_user(db_session):
    user = User(
        id=uuid.uuid4(),
        email="analyst.test@siftrix.internal",
        hashed_password="dummy_hash_scrypt",
        full_name="Sarah Connor",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(registered_user):
    token = create_access_token(subject=registered_user.id)
    return {"Authorization": f"Bearer {token}"}


# =========================================================================
# 1. Retry / Idempotency Tests
# =========================================================================

def test_scan_rewards_idempotency_prevents_duplicate_xp(db_session, registered_user):
    """Calling award_scan_rewards on the same scan record twice must return None on retry."""
    scan = ScanRecord(
        id=uuid.uuid4(),
        user_id=registered_user.id,
        target_type="message",
        target_content="Test message lure",
        overall_risk_score=95.0,
        verdict="malicious",
        risk_level="critical",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(scan)
    db_session.commit()

    # First award: returns dict with +100 XP (malicious) + 100 XP (first scan badge)
    res1 = award_scan_rewards(db_session, scan, registered_user.id)
    assert res1 is not None
    assert res1["xp_earned"] == 100
    assert "badge_first_scan" in res1["newly_unlocked_badges"]
    assert scan.xp_awarded_at is not None

    # Verify profile total_xp = 100 (base) + 100 (badge) = 200
    profile = db_session.query(GamificationProfile).filter_by(user_id=registered_user.id).first()
    assert profile.base_scan_xp == 100
    assert profile.total_xp == 200
    assert profile.scans_completed == 1
    assert profile.threats_neutralized == 1

    # Second award (retry/concurrency replay): must be strictly rejected
    res2 = award_scan_rewards(db_session, scan, registered_user.id)
    assert res2 is None

    # Profile balance must remain completely unchanged
    db_session.refresh(profile)
    assert profile.base_scan_xp == 100
    assert profile.total_xp == 200
    assert profile.scans_completed == 1


# =========================================================================
# 2. Level Progression and Badge Unlock Tests
# =========================================================================

def test_level_and_tier_calculation_math():
    """Verify level progression (500 XP per level) and tier calculation."""
    # 0 XP: Level 1, Novice Investigator, Field Analyst
    lvl, title, cur_xp = calculate_level_info(0)
    assert lvl == 1
    assert title == "Novice Investigator"
    assert cur_xp == 0
    assert calculate_tier(0) == "Field Analyst"

    # 499 XP: Level 1
    lvl, _, cur_xp = calculate_level_info(499)
    assert lvl == 1
    assert cur_xp == 499

    # 500 XP: Level 2, Junior SOC Analyst
    lvl, title, cur_xp = calculate_level_info(500)
    assert lvl == 2
    assert title == "Junior SOC Analyst"
    assert cur_xp == 0

    # 1350 XP: Level 3, Silver Warden
    lvl, title, cur_xp = calculate_level_info(1350)
    assert lvl == 3
    assert title == "Senior Threat Hunter"
    assert cur_xp == 350
    assert calculate_tier(1350) == "Silver Warden"

    # 3600 XP: Level 8, Gold Sentinel
    lvl, title, _ = calculate_level_info(3600)
    assert lvl == 8
    assert title == "Master Threat Defense Architect"
    assert calculate_tier(3600) == "Gold Sentinel"


def test_badge_unlocks_and_unsupported_badges_stay_locked(db_session, registered_user):
    """Verify that supported badges unlock at exact thresholds, while BEC & Urdu stay locked."""
    profile = get_or_create_profile(db_session, registered_user.id, is_user=True)
    db_session.commit()

    badges = serialize_badges(profile)
    badge_map = {b.id: b for b in badges}

    # Initially: all badges locked
    assert not badge_map["badge_first_scan"].unlocked
    assert not badge_map["badge_phish_catcher"].unlocked
    assert not badge_map["badge_bec_neutralizer"].unlocked
    assert not badge_map["badge_urdu_guardian"].unlocked

    # Unsupported badges have 0 progress and remain strictly locked
    assert badge_map["badge_bec_neutralizer"].progress.current == 0
    assert badge_map["badge_urdu_guardian"].progress.current == 0

    # Simulate 5 malicious scans for phish catcher
    for i in range(5):
        scan = ScanRecord(
            id=uuid.uuid4(),
            user_id=registered_user.id,
            target_type="url",
            target_content=f"https://phish{i}.example.com",
            overall_risk_score=90.0,
            verdict="malicious",
            risk_level="high",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(scan)
        db_session.commit()
        award_scan_rewards(db_session, scan, registered_user.id)

    db_session.refresh(profile)
    badges = serialize_badges(profile)
    badge_map = {b.id: b for b in badges}

    assert badge_map["badge_first_scan"].unlocked
    assert badge_map["badge_phish_catcher"].unlocked
    assert badge_map["badge_phish_catcher"].progress.current == 5
    # Still strictly locked:
    assert not badge_map["badge_bec_neutralizer"].unlocked
    assert not badge_map["badge_urdu_guardian"].unlocked


def test_ssrf_detector_badge_unlocks_on_blocked_ssrf(db_session, registered_user):
    """Verify badge_ssrf_detector unlocks when a scan has SSRF blocked finding."""
    scan = ScanRecord(
        id=uuid.uuid4(),
        user_id=registered_user.id,
        target_type="url",
        target_content="http://127.0.0.1:8080/admin",
        overall_risk_score=70.0,
        verdict="suspicious",
        risk_level="medium",
        agent_findings={"url_findings": {"validation_status": "blocked"}},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(scan)
    db_session.commit()

    res = award_scan_rewards(db_session, scan, registered_user.id)
    assert res is not None
    assert "badge_ssrf_detector" in res["newly_unlocked_badges"]


# =========================================================================
# 3. UTC Daily Streak Calculation Tests
# =========================================================================

def test_utc_daily_streak_calculation(db_session, registered_user):
    """Verify UTC daily streak accurately counts consecutive days and resets after gap."""
    now = datetime.now(timezone.utc)

    # 1. No scans: streak is 0
    assert calculate_utc_daily_streak(db_session, registered_user.id) == 0

    # 2. Scan today: streak is 1
    s1 = ScanRecord(
        id=uuid.uuid4(),
        user_id=registered_user.id,
        target_type="message",
        target_content="Scan today",
        overall_risk_score=10.0,
        verdict="safe",
        risk_level="low",
        created_at=now,
    )
    db_session.add(s1)
    db_session.commit()
    assert calculate_utc_daily_streak(db_session, registered_user.id) == 1

    # 3. Add scans for yesterday and 2 days ago: streak is 3
    s2 = ScanRecord(
        id=uuid.uuid4(),
        user_id=registered_user.id,
        target_type="message",
        target_content="Scan yesterday",
        overall_risk_score=10.0,
        verdict="safe",
        risk_level="low",
        created_at=now - timedelta(days=1),
    )
    s3 = ScanRecord(
        id=uuid.uuid4(),
        user_id=registered_user.id,
        target_type="message",
        target_content="Scan 2 days ago",
        overall_risk_score=10.0,
        verdict="safe",
        risk_level="low",
        created_at=now - timedelta(days=2),
    )
    db_session.add_all([s2, s3])
    db_session.commit()
    assert calculate_utc_daily_streak(db_session, registered_user.id) == 3

    # 4. If latest scan was 3 days ago (gap), streak breaks to 0
    user_stale = User(
        id=uuid.uuid4(),
        email="stale@siftrix.internal",
        hashed_password="hash",
        full_name="Stale User",
        is_active=True,
    )
    db_session.add(user_stale)
    db_session.commit()

    old_scan = ScanRecord(
        id=uuid.uuid4(),
        user_id=user_stale.id,
        target_type="message",
        target_content="Old scan",
        overall_risk_score=10.0,
        verdict="safe",
        risk_level="low",
        created_at=now - timedelta(days=3),
    )
    db_session.add(old_scan)
    db_session.commit()
    assert calculate_utc_daily_streak(db_session, user_stale.id) == 0


# =========================================================================
# 4. Guest Profile Merge Tests
# =========================================================================

def test_guest_gamification_merge_prevents_duplicate_badge_rewards(db_session, registered_user):
    """Merging a guest profile into an existing user must merge base XP and distinct badge rewards."""
    guest_session_id = uuid.uuid4()

    # User already has 1 scan and badge_first_scan (base 50 + badge 100 = 150)
    user_scan = ScanRecord(
        id=uuid.uuid4(),
        user_id=registered_user.id,
        target_type="message",
        target_content="User scan",
        overall_risk_score=20.0,
        verdict="safe",
        risk_level="low",
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(user_scan)
    db_session.commit()
    award_scan_rewards(db_session, user_scan, registered_user.id)

    user_profile = db_session.query(GamificationProfile).filter_by(user_id=registered_user.id).first()
    assert user_profile.base_scan_xp == 50
    assert user_profile.total_xp == 150
    assert "badge_first_scan" in user_profile.unlocked_badges

    # Guest performs 1 malicious scan and also unlocks badge_first_scan
    guest_scan = ScanRecord(
        id=uuid.uuid4(),
        user_id=guest_session_id,
        target_type="url",
        target_content="https://guest-evil.com",
        overall_risk_score=95.0,
        verdict="malicious",
        risk_level="critical",
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(guest_scan)
    db_session.commit()
    award_scan_rewards(db_session, guest_scan, guest_session_id)

    guest_profile = db_session.query(GamificationProfile).filter_by(session_id=guest_session_id).first()
    assert guest_profile.base_scan_xp == 100
    assert guest_profile.total_xp == 200

    # Perform migration
    migrate_guest_gamification(db_session, guest_session_id, registered_user.id)

    db_session.refresh(user_profile)
    # Merged base scan XP: 50 + 100 = 150
    assert user_profile.base_scan_xp == 150
    # Merged scans: 1 + 1 = 2
    assert user_profile.scans_completed == 2
    # Total XP must NOT double-count badge_first_scan reward (100):
    # Total XP = 150 (base) + 100 (single badge_first_scan reward) = 250
    assert user_profile.total_xp == 250
    # Guest profile row is cleanly deleted
    assert db_session.query(GamificationProfile).filter_by(session_id=guest_session_id).first() is None


# =========================================================================
# 5. Leaderboard Privacy Tests
# =========================================================================

def test_leaderboard_privacy_and_opt_in_safeguards(client, db_session, registered_user, auth_headers):
    """Leaderboard must exclude un-opted users, display pseudonyms, omit accuracyRate, and protect PII."""
    # 1. Un-opted user: does NOT appear on leaderboard
    profile = get_or_create_profile(db_session, registered_user.id, is_user=True)
    profile.base_scan_xp = 500
    profile.total_xp = 500
    profile.is_leaderboard_visible = False
    db_session.commit()

    resp = client.get("/api/gamification/leaderboard")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 0

    # 2. Opt-in user via PATCH /profile/visibility
    patch_resp = client.patch(
        "/api/gamification/profile/visibility",
        json={"is_leaderboard_visible": True},
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["isLeaderboardVisible"] is True

    # 3. User now appears on leaderboard
    resp = client.get("/api/gamification/leaderboard", headers=auth_headers)
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1

    entry = entries[0]
    assert entry["rank"] == 1
    assert entry["name"].startswith("Analyst S-")
    # Must NOT expose real name or email!
    assert "Sarah" not in entry["name"]
    assert "siftrix.internal" not in entry["name"]
    assert "analyst.test" not in entry["handle"]
    # accuracyRate is None / omitted as mandated
    assert entry["accuracyRate"] is None
    assert entry["isCurrentUser"] is True


# =========================================================================
# 6. Notification Tenant Isolation Tests
# =========================================================================

def test_notification_ownership_and_tenant_isolation(client, db_session, registered_user, auth_headers):
    """User A cannot access or mark User B's notifications as read."""
    other_user = User(
        id=uuid.uuid4(),
        email="other@siftrix.internal",
        hashed_password="hash",
        full_name="Bob Smith",
        is_active=True,
    )
    db_session.add(other_user)
    db_session.commit()

    # Create notification for User B
    b_notif = NotificationRecord(
        id=uuid.uuid4(),
        user_id=other_user.id,
        title="Alert for Bob",
        message="Secret threat alert",
        type="threat",
        read=False,
    )
    db_session.add(b_notif)
    db_session.commit()

    # User A views notifications: must not see User B's notification
    resp = client.get("/api/notifications", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 0

    # User A attempts to mark User B's notification as read: returns 404 Not Found
    patch_resp = client.patch(f"/api/notifications/{b_notif.id}/read", headers=auth_headers)
    assert patch_resp.status_code == 404
