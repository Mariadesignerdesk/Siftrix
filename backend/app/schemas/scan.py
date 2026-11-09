import ipaddress
import re
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.common import (
    TargetType,
    Verdict,
    RiskLevel,
    BilingualText,
    BilingualList,
    SAFE_MAX_SCORE,
    SUSPICIOUS_MAX_SCORE,
    HIGH_RISK_MAX_SCORE,
)


# --- SSRF & URL Validation Utilities ---

FORBIDDEN_SCHEMES = {"file", "ftp", "gopher", "data", "ldap", "dict", "javascript"}
DISALLOWED_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}
INTERNAL_TLDS = (".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".arpa")


def validate_url_for_ssrf(url_str: str) -> str:
    """Validate URL syntax and block internal, loopback, and cloud metadata SSRF targets.

    IMPORTANT SECURITY NOTE:
    This input validation prevents clients from submitting explicit private IP addresses,
    loopback addresses, cloud metadata endpoints, and internal network hostnames.
    However, static URL parsing alone cannot defend against:
      1. DNS Rebinding attacks (where a public domain resolves to a private IP).
      2. Time-of-check to time-of-use (TOCTOU) IP switches.
      3. Open redirects pointing from public URLs to internal services.
    The outbound HTTP fetching service (URL intelligence agent/crawler) MUST:
      - Resolve DNS immediately prior to socket connection.
      - Validate that the resolved destination IP is not private, loopback, or reserved.
      - Re-validate the destination IP on every HTTP redirect hop before following.
    """
    if not url_str or not isinstance(url_str, str):
        raise ValueError("URL cannot be empty")

    cleaned_url = url_str.strip()

    try:
        parsed = urlparse(cleaned_url)
    except Exception as e:
        raise ValueError(f"Malformed URL: {e}")

    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        raise ValueError("URL must use http or https scheme")

    if parsed.username or parsed.password:
        raise ValueError("URLs containing embedded user credentials are not permitted")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must include a valid host")

    hostname_lower = hostname.lower().strip(".")

    # Reject explicit localhost strings
    if hostname_lower in DISALLOWED_HOSTS:
        raise ValueError("Targeting localhost is forbidden")

    # Reject internal network domain extensions
    if any(hostname_lower.endswith(tld) for tld in INTERNAL_TLDS):
        raise ValueError("Targeting internal network hostnames is forbidden")

    # Determine if hostname is an IP literal
    is_ip = False
    try:
        raw_ip_str = hostname_lower.strip("[]")
        ip = ipaddress.ip_address(raw_ip_str)
        is_ip = True
    except ValueError:
        # Hostname is a domain name, not an IP literal
        is_ip = False

    if is_ip:
        # Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped

        # Block private, loopback, link-local, reserved, multicast, or unspecified IPs
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise ValueError(f"Targeting private, loopback, or reserved IP address ({ip}) is forbidden")

        # Explicit Cloud Metadata protection (AWS / GCP / Azure metadata endpoint: 169.254.169.254)
        if str(ip) == "169.254.169.254":
            raise ValueError("Targeting cloud metadata service (169.254.169.254) is forbidden")
    else:
        # For non-IP hostnames, require a qualified domain structure (must have at least one dot)
        if "." not in hostname_lower:
            raise ValueError("Single-label local hostnames are not permitted")

    return cleaned_url


# --- Request Payloads ---

class MessageScanRequest(BaseModel):
    """Payload for scanning SMS, WhatsApp, or email content."""
    content: str = Field(..., min_length=1, max_length=50000, description="Message text to analyze")
    sender: Optional[str] = Field(None, max_length=256, description="Optional sender phone, email, or handle")


class URLScanRequest(BaseModel):
    """Payload for scanning website links with SSRF protection."""
    url: str = Field(..., min_length=4, max_length=2048, description="URL or link to inspect")

    @field_validator("url")
    @classmethod
    def check_url_security(cls, v: str) -> str:
        return validate_url_for_ssrf(v)


class UnifiedScanRequest(BaseModel):
    """Universal scan request supporting both messages and links."""
    target_type: TargetType
    content: str = Field(..., min_length=1, max_length=50000)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @field_validator("content")
    @classmethod
    def validate_content_by_type(cls, v: str, info) -> str:
        if info.data.get("target_type") == TargetType.URL:
            return validate_url_for_ssrf(v)
        return v


# --- Typed Agent Findings ---

class MessageAgentFinding(BaseModel):
    """Structured telemetry from the Message Intelligence Agent."""
    risk_score: float = Field(ge=0.0, le=100.0)
    urgency_detected: bool = False
    impersonation_detected: bool = False
    credential_harvesting_detected: bool = False
    sentiment: Optional[str] = None
    indicators: List[str] = Field(default_factory=list)


class URLAgentFinding(BaseModel):
    """Structured telemetry from the URL Intelligence Agent."""
    risk_score: float = Field(ge=0.0, le=100.0)
    domain: str
    virustotal_malicious_count: int = 0
    virustotal_suspicious_count: int = 0
    is_typosquatting: bool = False
    suspicious_tld: bool = False
    redirect_count: int = 0
    indicators: List[str] = Field(default_factory=list)


class AdvisorAgentFinding(BaseModel):
    """Structured actionable advice from the Security Advisor Agent."""
    action_required: str
    dos: List[str] = Field(default_factory=list)
    donts: List[str] = Field(default_factory=list)


class StructuredAgentFindings(BaseModel):
    """Container aggregating findings from all specialized agents."""
    model_config = ConfigDict(from_attributes=True)

    message_intelligence: Optional[MessageAgentFinding] = None
    url_intelligence: Optional[URLAgentFinding] = None
    security_advisor: Optional[AdvisorAgentFinding] = None
    raw_metadata: Dict[str, Any] = Field(default_factory=dict, description="Raw telemetry & MCP tool outputs")


# --- Consolidated Scan Response (Frontend Contract) ---

class ScanResponse(BaseModel):
    """Consolidated threat evaluation returned to the frontend."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(..., description="Unique scan ID (UUIDv4)")
    user_id: Optional[uuid.UUID] = Field(None, description="Owner user ID or null for guest scans")
    target_type: TargetType
    target_content: str
    overall_risk_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Consolidated risk score from 0.0 (Safe) to 100.0 (Critical)",
    )
    verdict: Verdict
    risk_level: RiskLevel
    summary: BilingualText
    recommendations: BilingualList
    agent_findings: StructuredAgentFindings = Field(default_factory=StructuredAgentFindings)
    created_at: datetime
    updated_at: datetime

    @field_validator("agent_findings", mode="before")
    @classmethod
    def default_agent_findings_if_none(cls, v: Any) -> Any:
        if v is None:
            return StructuredAgentFindings()
        return v

    @model_validator(mode="after")
    def validate_score_and_verdict_consistency(self) -> "ScanResponse":
        """Enforce strict consistency between risk score, verdict, and risk level."""
        score = self.overall_risk_score

        # Rule 1: Safe verdict is strictly forbidden for scores > 29.9
        if score > SAFE_MAX_SCORE and self.verdict == Verdict.SAFE:
            raise ValueError(
                f"Risk score {score:.1f} exceeds safe threshold ({SAFE_MAX_SCORE}); verdict cannot be 'safe'."
            )

        # Rule 2: Scores >= 70.0 must be classified as malicious
        if score > SUSPICIOUS_MAX_SCORE and self.verdict != Verdict.MALICIOUS:
            raise ValueError(
                f"Risk score {score:.1f} is in malicious range (> {SUSPICIOUS_MAX_SCORE}); verdict must be 'malicious'."
            )

        # Rule 3: Malicious verdict cannot have a safe score (<= 29.9)
        if score <= SAFE_MAX_SCORE and self.verdict == Verdict.MALICIOUS:
            raise ValueError(
                f"Risk score {score:.1f} is in safe range (<= {SAFE_MAX_SCORE}); verdict cannot be 'malicious'."
            )

        # Rule 4: Critical risk level is reserved for severe threats (>= 90.0)
        if score < 90.0 and self.risk_level == RiskLevel.CRITICAL:
            raise ValueError(
                f"Risk score {score:.1f} is below 90.0; risk_level cannot be 'critical'."
            )

        # Rule 5: Low risk level is only for safe scores (<= 29.9)
        if score > SAFE_MAX_SCORE and self.risk_level == RiskLevel.LOW:
            raise ValueError(
                f"Risk score {score:.1f} exceeds safe threshold ({SAFE_MAX_SCORE}); risk_level cannot be 'low'."
            )

        return self
