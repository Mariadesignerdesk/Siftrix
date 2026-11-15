"""Comprehensive tests for Phase 2: Siftrix Authentication API Endpoints:
- POST /api/auth/register (success, duplicate 409, short password 422, whitespace cleaning)
- POST /api/auth/login (success, wrong password 401, non-existent user 401, inactive 403)
- GET /api/auth/me (valid Bearer token, missing token 401, expired token 401, tampered token 401, inactive 403)
- Guest scan history migration on signup and login
- Malformed X-Session-ID rejection with HTTP 400
- Anonymous scan and history compatibility
- Production configuration enforcement of non-default JWT secret
"""
import os
import uuid
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.config import Settings
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.scan import ScanRecord


# Isolated in-memory SQLite database for testing auth endpoints
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create all tables before each test and drop them after."""
    app.state.testing = True
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    app.state.testing = False


@pytest.fixture
def client():
    """Create test client with in-memory DB override."""
    return TestClient(app)


# =====================================================================
# 1. User Registration Tests (POST /api/auth/register)
# =====================================================================

def test_successful_signup_returns_jwt_and_profile(client):
    """Verify signup creates a user, returns a valid JWT, and returns user profile without password."""
    payload = {
        "email": "analyst.ibrahimi@siftrix.com",
        "password": "SecurePassword123!",
        "full_name": "Maimoona Ibrahimi",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data

    user_info = data["user"]
    assert user_info["email"] == "analyst.ibrahimi@siftrix.com"
    assert user_info["full_name"] == "Maimoona Ibrahimi"
    assert user_info["is_active"] is True
    assert "id" in user_info

    # Security check: Password or hash must NEVER appear in the response payload
    assert "password" not in user_info
    assert "hashed_password" not in user_info


def test_duplicate_email_signup_rejected_with_409(client):
    """Verify duplicate email registration is rejected with HTTP 409 Conflict."""
    payload = {
        "email": "duplicate@siftrix.com",
        "password": "Password123!",
        "full_name": "First User",
    }
    first_resp = client.post("/api/auth/register", json=payload)
    assert first_resp.status_code == 201

    # Attempt registration with identical email (different case)
    duplicate_payload = {
        "email": "  DUPLICATE@siftrix.com  ",
        "password": "AnotherPassword456!",
        "full_name": "Second User",
    }
    second_resp = client.post("/api/auth/register", json=duplicate_payload)
    assert second_resp.status_code == 409
    assert "already exists" in second_resp.json()["detail"]


def test_short_password_signup_rejected_with_422(client):
    """Verify passwords shorter than 8 characters are rejected with HTTP 422."""
    payload = {
        "email": "short@siftrix.com",
        "password": "short",
        "full_name": "Valid Name",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422


# =====================================================================
# 2. User Login Tests (POST /api/auth/login)
# =====================================================================

def test_successful_login_returns_jwt_and_profile(client):
    """Verify login with correct credentials returns valid JWT token and user profile."""
    # First register user
    client.post("/api/auth/register", json={
        "email": "login_user@siftrix.com",
        "password": "CorrectPassword123!",
        "full_name": "Login Tester",
    })

    # Now login
    login_resp = client.post("/api/auth/login", json={
        "email": "  LOGIN_USER@siftrix.com  ",
        "password": "CorrectPassword123!",
    })
    assert login_resp.status_code == 200

    data = login_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "login_user@siftrix.com"
    assert "hashed_password" not in data["user"]


def test_login_wrong_password_rejected_with_401(client):
    """Verify login with wrong password returns HTTP 401 Unauthorized."""
    client.post("/api/auth/register", json={
        "email": "victim@siftrix.com",
        "password": "CorrectPassword123!",
        "full_name": "Victim Tester",
    })

    response = client.post("/api/auth/login", json={
        "email": "victim@siftrix.com",
        "password": "WrongPassword999!",
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_nonexistent_email_rejected_with_401(client):
    """Verify login with unknown email returns generic HTTP 401 Unauthorized."""
    response = client.post("/api/auth/login", json={
        "email": "ghost@siftrix.com",
        "password": "AnyPassword123!",
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_inactive_user_rejected_with_403(client):
    """Verify deactivated user account cannot log in and receives HTTP 403."""
    reg = client.post("/api/auth/register", json={
        "email": "inactive@siftrix.com",
        "password": "Password123!",
        "full_name": "Inactive User",
    })
    assert reg.status_code == 201

    # Deactivate user directly in DB
    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == "inactive@siftrix.com").first()
        user.is_active = False
        db.commit()
    finally:
        db.close()

    response = client.post("/api/auth/login", json={
        "email": "inactive@siftrix.com",
        "password": "Password123!",
    })
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()


# =====================================================================
# 3. User Profile Endpoint (GET /api/auth/me)
# =====================================================================

def test_get_me_with_valid_bearer_token(client):
    """Verify GET /api/auth/me returns the authenticated user's profile."""
    reg = client.post("/api/auth/register", json={
        "email": "me_user@siftrix.com",
        "password": "Password123!",
        "full_name": "Profile Owner",
    })
    token = reg.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    profile = response.json()
    assert profile["email"] == "me_user@siftrix.com"
    assert profile["full_name"] == "Profile Owner"
    assert profile["is_active"] is True
    assert "hashed_password" not in profile


def test_get_me_missing_token_rejected_with_401(client):
    """Verify GET /api/auth/me without Bearer token raises HTTP 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_get_me_invalid_token_rejected_with_401(client):
    """Verify GET /api/auth/me with invalid or forged token raises HTTP 401."""
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.valid.jwt.token"})
    assert response.status_code == 401


def test_get_me_expired_token_rejected_with_401(client):
    """Verify GET /api/auth/me with expired token raises HTTP 401."""
    expired_token = create_access_token(
        subject=str(uuid.uuid4()),
        expires_delta=timedelta(seconds=-1),
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


# =====================================================================
# 4. Guest Scan Migration Tests
# =====================================================================

def test_guest_scan_migration_on_signup(client):
    """Verify scans created under X-Session-ID are re-associated with user on signup."""
    guest_session_id = uuid.uuid4()

    # 1. Guest performs a scan using X-Session-ID
    scan_resp = client.post(
        "/api/scan/message",
        json={"content": "Alert: Urgent verify your account OTP", "sender": "+923001234567"},
        headers={"X-Session-ID": str(guest_session_id)},
    )
    assert scan_resp.status_code == 200
    scan_id = scan_resp.json()["id"]

    # Verify scan belongs to guest_session_id in DB
    db = TestingSessionLocal()
    try:
        record = db.query(ScanRecord).filter(ScanRecord.id == uuid.UUID(scan_id)).first()
        assert record is not None
        assert record.user_id == guest_session_id
    finally:
        db.close()

    # 2. Guest registers with the same X-Session-ID header
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "email": "migrated_user@siftrix.com",
            "password": "Password123!",
            "full_name": "Migrated Analyst",
        },
        headers={"X-Session-ID": str(guest_session_id)},
    )
    assert reg_resp.status_code == 201
    user_id = uuid.UUID(reg_resp.json()["user"]["id"])
    token = reg_resp.json()["access_token"]

    # Verify scan has been migrated to user.id in DB
    db = TestingSessionLocal()
    try:
        updated_record = db.query(ScanRecord).filter(ScanRecord.id == uuid.UUID(scan_id)).first()
        assert updated_record.user_id == user_id
    finally:
        db.close()

    # 3. Authenticated user can now retrieve the migrated scan via GET /api/history without X-Session-ID
    history_resp = client.get(
        "/api/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert history_resp.status_code == 200
    items = history_resp.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == scan_id


def test_guest_scan_migration_on_login(client):
    """Verify scans performed as a guest are migrated when logging into an existing account."""
    # 1. Existing user account
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "email": "existing_analyst@siftrix.com",
            "password": "Password123!",
            "full_name": "Existing Analyst",
        },
    )
    assert reg_resp.status_code == 201
    user_id = uuid.UUID(reg_resp.json()["user"]["id"])

    # 2. Later, performs a guest scan on another browser
    guest_session_id = uuid.uuid4()
    scan_resp = client.post(
        "/api/scan/message",
        json={"content": "Urgent SMS phishing lure", "sender": "+923009999999"},
        headers={"X-Session-ID": str(guest_session_id)},
    )
    assert scan_resp.status_code == 200
    scan_id = scan_resp.json()["id"]

    # 3. Logs in providing X-Session-ID
    login_resp = client.post(
        "/api/auth/login",
        json={
            "email": "existing_analyst@siftrix.com",
            "password": "Password123!",
        },
        headers={"X-Session-ID": str(guest_session_id)},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # 4. Scan now belongs to user
    db = TestingSessionLocal()
    try:
        updated = db.query(ScanRecord).filter(ScanRecord.id == uuid.UUID(scan_id)).first()
        assert updated.user_id == user_id
    finally:
        db.close()

    # 5. User views it in their authenticated history
    history_resp = client.get("/api/history", headers={"Authorization": f"Bearer {token}"})
    assert history_resp.status_code == 200
    assert any(item["id"] == scan_id for item in history_resp.json()["items"])


def test_malformed_x_session_id_rejected_with_400(client):
    """Verify malformed X-Session-ID headers on auth endpoints return HTTP 400."""
    reg = client.post(
        "/api/auth/register",
        json={"email": "bad_session@siftrix.com", "password": "Password123!", "full_name": "Name"},
        headers={"X-Session-ID": "invalid-session-not-uuid"},
    )
    assert reg.status_code == 400
    assert "Invalid X-Session-ID header" in reg.json()["detail"]

    login = client.post(
        "/api/auth/login",
        json={"email": "bad_session@siftrix.com", "password": "Password123!"},
        headers={"X-Session-ID": "12345-not-a-uuid"},
    )
    assert login.status_code == 400


# =====================================================================
# 5. Anonymous Compatibility Tests
# =====================================================================

def test_anonymous_scans_and_history_remain_functional(client):
    """Verify guest scanning and history with X-Session-ID continue to work seamlessly."""
    guest_session_id = uuid.uuid4()

    # Anonymous scan with X-Session-ID
    resp = client.post(
        "/api/scan/message",
        json={"content": "Alert from Bank: Verify your credentials", "sender": "+923000000000"},
        headers={"X-Session-ID": str(guest_session_id)},
    )
    assert resp.status_code == 200
    assert resp.headers.get("X-Session-ID") == str(guest_session_id)

    # Anonymous history access with X-Session-ID
    history_resp = client.get(
        "/api/history",
        headers={"X-Session-ID": str(guest_session_id)},
    )
    assert history_resp.status_code == 200
    assert len(history_resp.json()["items"]) == 1

    # Anonymous history without token or X-Session-ID fails with 401
    unauth_resp = client.get("/api/history")
    assert unauth_resp.status_code == 401


# =====================================================================
# 6. Production Configuration Security Tests
# =====================================================================

def test_production_rejects_default_jwt_secret():
    """Verify Settings rejects default dev secret when running in production."""
    old_env = os.environ.get("RAILWAY_ENVIRONMENT")
    try:
        os.environ["RAILWAY_ENVIRONMENT"] = "production"
        with pytest.raises(Exception) as excinfo:
            Settings(
                JWT_SECRET_KEY="siftrix-development-only-jwt-secret-do-not-use-in-production",
            )
        assert "JWT_SECRET_KEY environment variable is strictly required in production" in str(excinfo.value)

        # Confirm custom secret passes in production
        prod_settings = Settings(
            JWT_SECRET_KEY="custom-secure-production-jwt-secret-key-32chars!!",
        )
        assert prod_settings.JWT_SECRET_KEY == "custom-secure-production-jwt-secret-key-32chars!!"
    finally:
        if old_env is not None:
            os.environ["RAILWAY_ENVIRONMENT"] = old_env
        else:
            os.environ.pop("RAILWAY_ENVIRONMENT", None)


# =====================================================================
# 7. Session Ownership & Impersonation Prevention Security Tests
# =====================================================================

def test_guest_cannot_read_or_delete_registered_user_history_via_x_session_id(client):
    """Prove an unauthenticated guest cannot access or delete a registered user's scan history using their UUID."""
    # 1. Register user and perform an authenticated scan
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "email": "protected_owner@siftrix.com",
            "password": "Password123!",
            "full_name": "Protected Owner",
        },
    )
    assert reg_resp.status_code == 201
    user_id_str = reg_resp.json()["user"]["id"]
    token = reg_resp.json()["access_token"]

    scan_resp = client.post(
        "/api/scan/message",
        json={"content": "Confidential user scan content", "sender": "+923001112222"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert scan_resp.status_code == 200
    scan_id = scan_resp.json()["id"]

    # 2. Unauthenticated request supplying the registered user's UUID in X-Session-ID must be rejected with 401
    list_Spoof = client.get("/api/history", headers={"X-Session-ID": user_id_str})
    assert list_Spoof.status_code == 401

    detail_spoof = client.get(f"/api/history/{scan_id}", headers={"X-Session-ID": user_id_str})
    assert detail_spoof.status_code == 401

    delete_spoof = client.delete(f"/api/history/{scan_id}", headers={"X-Session-ID": user_id_str})
    assert delete_spoof.status_code == 401


def test_guest_scan_cannot_use_registered_user_uuid_as_owner(client):
    """Prove an unauthenticated scan supplying a registered user's UUID generates a fresh guest UUID instead."""
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "email": "target_owner@siftrix.com",
            "password": "Password123!",
            "full_name": "Target Owner",
        },
    )
    assert reg_resp.status_code == 201
    user_id = uuid.UUID(reg_resp.json()["user"]["id"])
    token = reg_resp.json()["access_token"]

    # Guest attempts to create a scan pretending to be user_id via X-Session-ID
    spoof_scan = client.post(
        "/api/scan/message",
        json={"content": "Injected guest scan attempting to pollute user history", "sender": "+923003334444"},
        headers={"X-Session-ID": str(user_id)},
    )
    assert spoof_scan.status_code == 200
    emitted_session = spoof_scan.headers.get("X-Session-ID")
    assert emitted_session is not None
    assert uuid.UUID(emitted_session) != user_id

    # Verify DB owner is the fresh guest UUID, NOT the registered user's UUID
    scan_id = uuid.UUID(spoof_scan.json()["id"])
    db = TestingSessionLocal()
    try:
        record = db.query(ScanRecord).filter(ScanRecord.id == scan_id).first()
        assert record is not None
        assert record.user_id != user_id
        assert record.user_id == uuid.UUID(emitted_session)
    finally:
        db.close()

    # Registered user's history remains clean (0 items)
    user_history = client.get("/api/history", headers={"Authorization": f"Bearer {token}"})
    assert user_history.status_code == 200
    assert user_history.json()["total"] == 0


def test_guest_migration_cannot_steal_registered_user_scans(client):
    """Prove register and login cannot migrate scans belonging to another registered user."""
    # 1. Victim registers and creates a scan
    victim_reg = client.post(
        "/api/auth/register",
        json={
            "email": "victim_owner@siftrix.com",
            "password": "Password123!",
            "full_name": "Victim Owner",
        },
    )
    assert victim_reg.status_code == 201
    victim_id = uuid.UUID(victim_reg.json()["user"]["id"])
    victim_token = victim_reg.json()["access_token"]

    victim_scan = client.post(
        "/api/scan/message",
        json={"content": "Victim private scan", "sender": "+923005556666"},
        headers={"Authorization": f"Bearer {victim_token}"},
    )
    assert victim_scan.status_code == 200
    victim_scan_id = uuid.UUID(victim_scan.json()["id"])

    # 2. Attacker registers while supplying victim's UUID in X-Session-ID
    attacker_reg = client.post(
        "/api/auth/register",
        json={
            "email": "attacker@siftrix.com",
            "password": "Password123!",
            "full_name": "Attacker User",
        },
        headers={"X-Session-ID": str(victim_id)},
    )
    assert attacker_reg.status_code == 201
    attacker_token = attacker_reg.json()["access_token"]

    # 3. Attacker also logs in while supplying victim's UUID in X-Session-ID
    attacker_login = client.post(
        "/api/auth/login",
        json={
            "email": "attacker@siftrix.com",
            "password": "Password123!",
        },
        headers={"X-Session-ID": str(victim_id)},
    )
    assert attacker_login.status_code == 200

    # 4. Verify victim's scan STILL belongs to victim in DB and was not migrated to attacker
    db = TestingSessionLocal()
    try:
        record = db.query(ScanRecord).filter(ScanRecord.id == victim_scan_id).first()
        assert record is not None
        assert record.user_id == victim_id
    finally:
        db.close()

    # 5. Victim still sees their scan; attacker sees 0 scans
    victim_hist = client.get("/api/history", headers={"Authorization": f"Bearer {victim_token}"})
    assert victim_hist.status_code == 200
    assert victim_hist.json()["total"] == 1

    attacker_hist = client.get("/api/history", headers={"Authorization": f"Bearer {attacker_token}"})
    assert attacker_hist.status_code == 200
    assert attacker_hist.json()["total"] == 0


def test_authenticated_scans_do_not_expose_account_uuid_in_x_session_id_and_retrieve_history(client):
    """Verify authenticated scan responses never emit X-Session-ID and authenticated users can retrieve their history."""
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "email": "auth_scanner@siftrix.com",
            "password": "Password123!",
            "full_name": "Authenticated Scanner",
        },
    )
    assert reg_resp.status_code == 201
    user_id = uuid.UUID(reg_resp.json()["user"]["id"])
    token = reg_resp.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 1. POST /api/scan/message as authenticated user
    msg_scan = client.post(
        "/api/scan/message",
        json={"content": "Urgent OTP verification message", "sender": "+923007778888"},
        headers=auth_headers,
    )
    assert msg_scan.status_code == 200
    assert "X-Session-ID" not in msg_scan.headers
    assert "x-session-id" not in {k.lower() for k in msg_scan.headers.keys()}

    # 2. POST /api/scan (unified) as authenticated user
    unified_scan = client.post(
        "/api/scan",
        json={"target_type": "message", "content": "Unified scan payload for authenticated user"},
        headers=auth_headers,
    )
    assert unified_scan.status_code == 200
    assert "X-Session-ID" not in unified_scan.headers
    assert "x-session-id" not in {k.lower() for k in unified_scan.headers.keys()}

    # 3. Verify authenticated user can retrieve both scans in history
    hist_resp = client.get("/api/history", headers=auth_headers)
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert hist_data["total"] == 2
    returned_ids = {item["id"] for item in hist_data["items"]}
    assert msg_scan.json()["id"] in returned_ids
    assert unified_scan.json()["id"] in returned_ids

    # Verify DB records are owned by user_id
    db = TestingSessionLocal()
    try:
        records = db.query(ScanRecord).filter(ScanRecord.user_id == user_id).all()
        assert len(records) == 2
    finally:
        db.close()
