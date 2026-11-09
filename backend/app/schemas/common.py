from enum import Enum
from typing import List
from pydantic import BaseModel, Field


# --- Preserved Existing Enums ---

class TargetType(str, Enum):
    """Type of entity scanned."""
    MESSAGE = "message"
    URL = "url"
    EMAIL = "email"


class Verdict(str, Enum):
    """Threat verdict classification."""
    SAFE = "safe"
    SUSPICIOUS = "suspicious"
    MALICIOUS = "malicious"


class RiskLevel(str, Enum):
    """Risk severity categorization."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# --- Bilingual Structures ---

class BilingualText(BaseModel):
    """Bilingual string container for English and Roman Urdu."""
    en: str = Field(..., description="English explanation")
    ur: str = Field(..., description="Roman Urdu explanation")


class BilingualList(BaseModel):
    """Bilingual list container for English and Roman Urdu recommendations."""
    en: List[str] = Field(default_factory=list, description="English guidance points")
    ur: List[str] = Field(default_factory=list, description="Roman Urdu guidance points")


# --- Risk Score Threshold Constants & Helpers ---

SAFE_MAX_SCORE = 29.9
SUSPICIOUS_MAX_SCORE = 69.9
HIGH_RISK_MAX_SCORE = 89.9


def calculate_verdict(score: float) -> Verdict:
    """Determine threat verdict based on score thresholds."""
    if score <= SAFE_MAX_SCORE:
        return Verdict.SAFE
    elif score <= SUSPICIOUS_MAX_SCORE:
        return Verdict.SUSPICIOUS
    else:
        return Verdict.MALICIOUS


def calculate_risk_level(score: float) -> RiskLevel:
    """Determine risk severity level based on score thresholds."""
    if score <= SAFE_MAX_SCORE:
        return RiskLevel.LOW
    elif score <= SUSPICIOUS_MAX_SCORE:
        return RiskLevel.MEDIUM
    elif score <= HIGH_RISK_MAX_SCORE:
        return RiskLevel.HIGH
    else:
        return RiskLevel.CRITICAL
