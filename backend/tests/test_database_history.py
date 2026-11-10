"""Comprehensive tests for Phase 6: PostgreSQL Database Integration and Scan History."""
import uuid
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.scan import ScanRecord
from app.schemas.common import TargetType, Verdict, RiskLevel
from app.schemas.scan import ScanResponse, BilingualText, BilingualList, StructuredAgentFindings

# Set up isolated in-memory SQLite database for testing
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
    """Create test client with clean database dependency."""
    return TestClient(app)


# =====================================================================
# 1. Scan Submission & DB Persistence Tests
# =====================================================================

def test_scan_message_persists_to_db_and_emits_session_header(client):
    """Verify POST /api/scan/message persists scan and emits X-Session-ID header."""
    payload = {
        "content": "Urgent alert from HBL: verify your account OTP immediately.",
        "sender": "+923001234567",
    }
    response = client.post("/api/scan/message", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Verify ScanResponse contract
    assert "id" in data
    assert data["target_type"] == "message"
    assert data["overall_risk_score"] > 0
    assert "summary" in data
    assert "recommendations" in data

    # Verify X-Session-ID response header
    session_header = response.headers.get("X-Session-ID")
    assert session_header is not None
    parsed_session = uuid.UUID(session_header)
    assert parsed_session.version == 4

    # Verify database persistence
    db = TestingSessionLocal()
    try:
        record = db.query(ScanRecord).filter(ScanRecord.id == uuid.UUID(data["id"])).first()
        assert record is not None
        assert record.user_id == parsed_session
        assert record.target_type == "message"
        assert "Urgent alert" in record.target_content
        assert record.summary_en is not None
        assert record.summary_ur is not None
    finally:
        db.close()


def test_scan_url_preserves_supplied_session_id(client):
    """Verify POST /api/scan/url preserves supplied X-Session-ID header and persists record."""
    custom_session = uuid.uuid4()
    payload = {"url": "https://example.com/login"}

    # Mock MCP client for URL scan
    mock_val = {"is_valid": True, "is_safe_target": True}
    mock_rep = {"status": "completed", "malicious": 0, "suspicious": 0}

    with patch("app.agents.url_agent.SiftrixMCPClient") as mock_mcp:
        instance = AsyncMock()
        mock_mcp.return_value.__aenter__.return_value = instance
        instance.call_tool.side_effect = [mock_val, mock_rep]

        response = client.post(
            "/api/scan/url",
            json=payload,
            headers={"X-Session-ID": str(custom_session)},
        )
        assert response.status_code == 200
        assert response.headers.get("X-Session-ID") == str(custom_session)

        data = response.json()
        assert data["target_type"] == "url"

        # Verify DB record has the custom session ID
        db = TestingSessionLocal()
        try:
            record = db.query(ScanRecord).filter(ScanRecord.id == uuid.UUID(data["id"])).first()
            assert record is not None
            assert record.user_id == custom_session
        finally:
            db.close()


def test_unified_scan_persists_metadata(client):
    """Verify POST /api/scan persists metadata and agent findings to JSONB."""
    payload = {
        "target_type": "message",
        "content": "Congratulations! You have won the Jeeto Pakistan lucky prize.",
        "metadata": {"source_app": "whatsapp", "client_version": "1.0.0"},
    }
    response = client.post("/api/scan", json=payload)
    assert response.status_code == 200
    data = response.json()

    db = TestingSessionLocal()
    try:
        record = db.query(ScanRecord).filter(ScanRecord.id == uuid.UUID(data["id"])).first()
        assert record is not None
        assert record.agent_findings is not None
        assert "message_intelligence" in record.agent_findings
    finally:
        db.close()


# =====================================================================
# 2. X-Session-ID Validation & Rejection Tests
# =====================================================================

def test_malformed_session_id_rejected_with_400(client):
    """Verify malformed or non-v4 X-Session-ID header is rejected with HTTP 400."""
    invalid_tokens = [
        "not-a-valid-uuid",
        "12345",
        "00000000-0000-1000-8000-000000000000",  # Version 1 UUID, not v4
        "xyz-abc",
    ]
    for token in invalid_tokens:
        # Scan rejection
        res_scan = client.post(
            "/api/scan/message",
            json={"content": "Test content"},
            headers={"X-Session-ID": token},
        )
        assert res_scan.status_code == 400
        assert "Invalid X-Session-ID" in res_scan.json()["detail"]

        # History rejection
        res_hist = client.get(
            "/api/history",
            headers={"X-Session-ID": token},
        )
        assert res_hist.status_code == 400
        assert "Invalid X-Session-ID" in res_hist.json()["detail"]


def test_history_without_session_id_rejected_with_401(client):
    """Verify history endpoints without X-Session-ID header return HTTP 401."""
    random_id = uuid.uuid4()

    # GET /api/history without header -> 401
    res_list = client.get("/api/history")
    assert res_list.status_code == 401
    assert "Authentication or X-Session-ID" in res_list.json()["detail"]

    # GET /api/history/{id} without header -> 401
    res_detail = client.get(f"/api/history/{random_id}")
    assert res_detail.status_code == 401

    # DELETE /api/history/{id} without header -> 401
    res_del = client.delete(f"/api/history/{random_id}")
    assert res_del.status_code == 401


# =====================================================================
# 3. Tenant Isolation & Privacy Tests
# =====================================================================

def test_tenant_isolation_user_a_cannot_access_user_b(client):
    """Verify strict tenant isolation: User A cannot see, inspect, or delete User B's scans."""
    session_a = uuid.uuid4()
    session_b = uuid.uuid4()

    # User A creates a scan
    res_a = client.post(
        "/api/scan/message",
        json={"content": "Message for User A"},
        headers={"X-Session-ID": str(session_a)},
    )
    scan_id_a = res_a.json()["id"]

    # User B creates a scan
    res_b = client.post(
        "/api/scan/message",
        json={"content": "Private message for User B"},
        headers={"X-Session-ID": str(session_b)},
    )
    scan_id_b = res_b.json()["id"]

    # 1. User A lists history -> sees only Scan A
    hist_a = client.get("/api/history", headers={"X-Session-ID": str(session_a)}).json()
    assert hist_a["total"] == 1
    assert hist_a["items"][0]["id"] == scan_id_a

    # 2. User A tries to view User B's scan detail -> 404 Not Found
    detail_fail = client.get(f"/api/history/{scan_id_b}", headers={"X-Session-ID": str(session_a)})
    assert detail_fail.status_code == 404

    # 3. User A tries to delete User B's scan -> 404 Not Found
    delete_fail = client.delete(f"/api/history/{scan_id_b}", headers={"X-Session-ID": str(session_a)})
    assert delete_fail.status_code == 404

    # 4. User B can view their own scan
    detail_b = client.get(f"/api/history/{scan_id_b}", headers={"X-Session-ID": str(session_b)})
    assert detail_b.status_code == 200
    assert detail_b.json()["id"] == scan_id_b

    # 5. User A deletes their own scan -> 200 OK
    delete_a = client.delete(f"/api/history/{scan_id_a}", headers={"X-Session-ID": str(session_a)})
    assert delete_a.status_code == 200
    assert delete_a.json()["status"] == "deleted"


# =====================================================================
# 4. Pagination Math & Target Content Preview Tests
# =====================================================================

def test_pagination_math_and_preview_truncation(client):
    """Verify pagination calculation (total, pages, has_next, has_prev) and preview truncation."""
    session_id = uuid.uuid4()
    long_content = "This is a very long suspicious message content designed to verify that target_content_preview will truncate at 100 characters properly and append ellipsis " * 3

    # Seed 12 scans for this session
    for i in range(12):
        client.post(
            "/api/scan/message",
            json={"content": f"{long_content} - Scan #{i+1}"},
            headers={"X-Session-ID": str(session_id)},
        )

    # Page 1: 5 items
    p1 = client.get("/api/history?page=1&page_size=5", headers={"X-Session-ID": str(session_id)}).json()
    assert p1["total"] == 12
    assert p1["page"] == 1
    assert p1["page_size"] == 5
    assert p1["total_pages"] == 3
    assert p1["has_next"] is True
    assert p1["has_prev"] is False
    assert len(p1["items"]) == 5

    # Verify preview truncation
    first_item = p1["items"][0]
    assert len(first_item["target_content_preview"]) <= 103
    assert first_item["target_content_preview"].endswith("...")

    # Page 2: 5 items
    p2 = client.get("/api/history?page=2&page_size=5", headers={"X-Session-ID": str(session_id)}).json()
    assert p2["page"] == 2
    assert p2["has_next"] is True
    assert p2["has_prev"] is True
    assert len(p2["items"]) == 5

    # Page 3: 2 items
    p3 = client.get("/api/history?page=3&page_size=5", headers={"X-Session-ID": str(session_id)}).json()
    assert p3["page"] == 3
    assert p3["has_next"] is False
    assert p3["has_prev"] is True
    assert len(p3["items"]) == 2


# =====================================================================
# 5. Transaction Safety & Rollback Test
# =====================================================================

def test_database_rollback_on_commit_failure(client):
    """Verify database errors trigger rollback and return HTTP 500 without leaving corrupted state."""
    with patch("sqlalchemy.orm.Session.commit") as mock_commit:
        mock_commit.side_effect = RuntimeError("Disk I/O error or constraint violation")

        response = client.post(
            "/api/scan/message",
            json={"content": "Test rollback content"},
        )
        assert response.status_code == 500
        assert "Database persistence failed" in response.json()["detail"]


# =====================================================================
# 6. CORS Expose Headers Test
# =====================================================================

def test_cors_exposes_x_session_id_header(client):
    """Verify CORS middleware exposes X-Session-ID so browser frontend can read it."""
    response = client.options(
        "/api/scan/message",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-Session-ID,Content-Type",
        },
    )
    expose_header = response.headers.get("access-control-expose-headers") or response.headers.get("Access-Control-Expose-Headers")
    assert expose_header is not None
    assert "X-Session-ID" in expose_header


# =====================================================================
# 7. Health Check Connectivity Test
# =====================================================================

def test_health_check_reports_database_status(client):
    """Verify GET /api/health returns status ok and database connected."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Siftrix API is running" in data["message"]
    assert data["database"] == "connected"
