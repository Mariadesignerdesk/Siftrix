import uuid
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from app.schemas.common import (
    TargetType,
    Verdict,
    RiskLevel,
    BilingualText,
    BilingualList,
    SAFE_MAX_SCORE,
    SUSPICIOUS_MAX_SCORE,
    calculate_verdict,
    calculate_risk_level,
)
from app.schemas.scan import (
    URLScanRequest,
    validate_url_for_ssrf,
    ScanResponse,
    StructuredAgentFindings,
)
from app.schemas.history import ScanHistoryItem
from app.models.scan import ScanRecord


# --- 1. Valid URL Tests ---
def test_valid_urls_allowed():
    """Verify standard valid public URLs pass validation."""
    valid_urls = [
        "https://example.com",
        "https://www.google.com/search?q=test",
        "http://subdomain.trusted-service.org/login.php?user=123",
        "http://8.8.8.8/dns-query",
    ]
    for url in valid_urls:
        req = URLScanRequest(url=url)
        assert req.url == url


# --- 2. Invalid URL Tests ---
def test_invalid_urls_rejected():
    """Verify malformed URLs and forbidden schemes are rejected."""
    invalid_urls = [
        "ftp://example.com/file.txt",
        "file:///etc/passwd",
        "gopher://example.com",
        "javascript:alert(1)",
        "https://user:password@example.com",
        "not-a-valid-url",
        "http://",
        "",
    ]
    for url in invalid_urls:
        with pytest.raises(ValidationError):
            URLScanRequest(url=url)


# --- 3. Localhost URL Tests ---
def test_localhost_urls_rejected():
    """Verify localhost targets are strictly blocked."""
    localhost_urls = [
        "http://localhost",
        "http://localhost:8000/api",
        "http://127.0.0.1:3000",
        "http://127.0.0.1/admin",
        "http://[::1]:8080",
        "http://service.localhost",
    ]
    for url in localhost_urls:
        with pytest.raises(ValidationError) as exc:
            URLScanRequest(url=url)
        assert "localhost" in str(exc.value).lower() or "forbidden" in str(exc.value).lower()


# --- 4. Private IP URL Tests ---
def test_private_ip_urls_rejected():
    """Verify RFC 1918 private IPv4 and private IPv6 ranges are blocked."""
    private_urls = [
        "http://10.0.0.1/status",
        "http://172.16.0.1:5000",
        "http://192.168.1.1/router",
        "http://[fd00::1]/service",
        "http://service.internal",
        "http://intranet/dashboard",
    ]
    for url in private_urls:
        with pytest.raises(ValidationError) as exc:
            URLScanRequest(url=url)
        assert "private" in str(exc.value).lower() or "forbidden" in str(exc.value).lower() or "not permitted" in str(exc.value).lower()


# --- 5. Link-Local & Cloud Metadata IP Tests ---
def test_cloud_metadata_ip_rejected():
    """Verify cloud metadata endpoints (169.254.169.254) are rejected."""
    metadata_urls = [
        "http://169.254.169.254/latest/meta-data/",
        "http://169.254.169.254:80",
        "http://169.254.1.1/link-local",
    ]
    for url in metadata_urls:
        with pytest.raises(ValidationError) as exc:
            URLScanRequest(url=url)
        assert "metadata" in str(exc.value).lower() or "link-local" in str(exc.value).lower() or "forbidden" in str(exc.value).lower()


# --- 6. Risk Score Boundaries & Consistency Tests ---
def test_risk_score_calculation_thresholds():
    """Verify calculated verdicts and risk levels across defined thresholds."""
    assert calculate_verdict(0.0) == Verdict.SAFE
    assert calculate_verdict(10.0) == Verdict.SUSPICIOUS
    assert calculate_verdict(20.0) == Verdict.SUSPICIOUS
    assert calculate_verdict(29.9) == Verdict.SUSPICIOUS
    assert calculate_verdict(30.0) == Verdict.SUSPICIOUS
    assert calculate_verdict(69.9) == Verdict.SUSPICIOUS
    assert calculate_verdict(70.0) == Verdict.MALICIOUS
    assert calculate_verdict(100.0) == Verdict.MALICIOUS

    assert calculate_risk_level(0.0) == RiskLevel.LOW
    assert calculate_risk_level(15.0) == RiskLevel.MEDIUM
    assert calculate_risk_level(20.0) == RiskLevel.MEDIUM
    assert calculate_risk_level(45.0) == RiskLevel.MEDIUM
    assert calculate_risk_level(75.0) == RiskLevel.HIGH
    assert calculate_risk_level(95.0) == RiskLevel.CRITICAL


def test_scan_response_score_boundary_validation():
    """Verify ScanResponse enforces logical consistency between score, verdict, and level."""
    now = datetime.now(timezone.utc)
    base_data = {
        "id": uuid.uuid4(),
        "target_type": TargetType.MESSAGE,
        "target_content": "Sample message content",
        "summary": BilingualText(en="Sample summary", ur="Sample khulasa"),
        "recommendations": BilingualList(en=["Don't click"], ur=["Click mat karein"]),
        "created_at": now,
        "updated_at": now,
    }

    # Safe score (0.0) with Safe verdict -> OK
    res = ScanResponse(**base_data, overall_risk_score=0.0, verdict=Verdict.SAFE, risk_level=RiskLevel.LOW)
    assert res.overall_risk_score == 0.0

    # Inconsistent: Score 20.0 with Safe verdict -> Must raise ValueError
    with pytest.raises(ValueError):
        ScanResponse(**base_data, overall_risk_score=20.0, verdict=Verdict.SAFE, risk_level=RiskLevel.MEDIUM)

    # Inconsistent: Score 85.0 with Safe verdict -> Must raise ValueError
    with pytest.raises(ValueError):
        ScanResponse(**base_data, overall_risk_score=85.0, verdict=Verdict.SAFE, risk_level=RiskLevel.HIGH)

    # Inconsistent: Score 0.0 with Malicious verdict -> Must raise ValueError
    with pytest.raises(ValueError):
        ScanResponse(**base_data, overall_risk_score=0.0, verdict=Verdict.MALICIOUS, risk_level=RiskLevel.LOW)

    # Out of range scores (<0 or >100) -> Must raise ValidationError
    with pytest.raises(ValidationError):
        ScanResponse(**base_data, overall_risk_score=105.0, verdict=Verdict.MALICIOUS, risk_level=RiskLevel.CRITICAL)

    with pytest.raises(ValidationError):
        ScanResponse(**base_data, overall_risk_score=-5.0, verdict=Verdict.SAFE, risk_level=RiskLevel.LOW)


# --- 7. Bilingual Model-to-Schema Mapping Tests ---
def test_bilingual_orm_model_to_schema_mapping():
    """Verify ScanRecord ORM properties map cleanly into ScanResponse."""
    now = datetime.now(timezone.utc)
    record = ScanRecord(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        target_type="message",
        target_content="Fake bank alert asking for password",
        overall_risk_score=85.0,
        verdict="malicious",
        risk_level="high",
        summary_en="Banking credential phishing lure detected.",
        summary_ur="Bank maloomat churanay ka farzi paighaam.",
        recommendations_en=["Do not share password.", "Call official bank helpline."],
        recommendations_ur=["Apna password kisi se share na karein.", "Bank helpline par call karein."],
        agent_findings={"message_intelligence": {"risk_score": 85.0, "urgency_detected": True}},
        created_at=now,
        updated_at=now,
    )

    response = ScanResponse.model_validate(record)
    assert response.id == record.id
    assert response.user_id == record.user_id
    assert response.summary.en == "Banking credential phishing lure detected."
    assert response.summary.ur == "Bank maloomat churanay ka farzi paighaam."
    assert "Do not share password." in response.recommendations.en
    assert "Apna password kisi se share na karein." in response.recommendations.ur
    assert response.agent_findings.message_intelligence.urgency_detected is True


# --- 8. History Preview Generation Tests ---
def test_history_preview_generation():
    """Verify target_content_preview is computed and truncated dynamically."""
    now = datetime.now(timezone.utc)
    short_record = ScanRecord(
        id=uuid.uuid4(),
        target_type="message",
        target_content="Short alert message",
        overall_risk_score=0.0,
        verdict="safe",
        risk_level="low",
        created_at=now,
        updated_at=now,
    )
    item_short = ScanHistoryItem.model_validate(short_record)
    assert item_short.target_content_preview == "Short alert message"

    long_text = "This is a very long suspicious email body that contains extensive social engineering tactics " * 5
    long_record = ScanRecord(
        id=uuid.uuid4(),
        target_type="email",
        target_content=long_text,
        overall_risk_score=75.0,
        verdict="malicious",
        risk_level="high",
        created_at=now,
        updated_at=now,
    )
    item_long = ScanHistoryItem.model_validate(long_record)
    assert len(item_long.target_content_preview) <= 103
    assert item_long.target_content_preview.endswith("...")
