"""Shared schema definitions and data contracts for Siftrix."""
from app.schemas.common import (
    TargetType,
    Verdict,
    RiskLevel,
    BilingualText,
    BilingualList,
)
from app.schemas.scan import (
    MessageScanRequest,
    URLScanRequest,
    UnifiedScanRequest,
    MessageAgentFinding,
    URLAgentFinding,
    AdvisorAgentFinding,
    StructuredAgentFindings,
    ScanResponse,
)
from app.schemas.history import (
    ScanHistoryItem,
    ScanHistoryListResponse,
    ScanDetailResponse,
)
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    TokenPayload,
)

__all__ = [
    "TargetType",
    "Verdict",
    "RiskLevel",
    "BilingualText",
    "BilingualList",
    "MessageScanRequest",
    "URLScanRequest",
    "UnifiedScanRequest",
    "MessageAgentFinding",
    "URLAgentFinding",
    "AdvisorAgentFinding",
    "StructuredAgentFindings",
    "ScanResponse",
    "ScanHistoryItem",
    "ScanHistoryListResponse",
    "ScanDetailResponse",
    "UserRegisterRequest",
    "UserLoginRequest",
    "UserResponse",
    "TokenResponse",
    "TokenPayload",
]
