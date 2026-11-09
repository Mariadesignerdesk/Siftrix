import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from sqlalchemy import Column, String, Float, Text, DateTime, JSON, Index, Uuid
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base

# Use JSONB on PostgreSQL for high-speed indexing, fallback to standard JSON on generic SQL
JSONType = JSON().with_variant(JSONB, "postgresql")


class ScanRecord(Base):
    """Stores scan transactions, risk evaluations, and multi-agent findings in PostgreSQL."""

    __tablename__ = "scans"

    # Native PostgreSQL UUID Primary Key
    id = Column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        doc="Unique identifier for the scan record (UUIDv4).",
    )

    # User Ownership & Privacy (Nullable for guest scans, indexed for tenant isolation)
    user_id = Column(
        Uuid,
        nullable=True,
        index=True,
        doc="Owner user ID. Nullable for anonymous/guest scans.",
    )

    # Target Metadata
    target_type = Column(String(20), nullable=False, index=True)   # "message", "url", "email"
    target_content = Column(Text, nullable=False)                  # Analyzed text, link, or email body

    # Threat Metrics (Indexed for analytics and dashboard filtering)
    overall_risk_score = Column(Float, nullable=False, default=0.0) # 0.0 to 100.0
    verdict = Column(String(20), nullable=False, default="safe", index=True)      # "safe", "suspicious", "malicious"
    risk_level = Column(String(20), nullable=False, default="low", index=True)   # "low", "medium", "high", "critical"

    # Bilingual Summaries (English & Roman Urdu)
    summary_en = Column(Text, nullable=True)                       # e.g., "Urgent banking credential lure detected."
    summary_ur = Column(Text, nullable=True)                       # e.g., "Yeh message ek farzi bank phishing scam hai..."

    # Bilingual Recommendations (JSON lists)
    recommendations_en = Column(JSONType, nullable=True)           # ["Do not click the link", "Block the sender"]
    recommendations_ur = Column(JSONType, nullable=True)           # ["Link par click mat karein", "Sender ko block karein"]

    # Full Multi-Agent Telemetry (JSONB)
    agent_findings = Column(JSONType, nullable=True)               # Structured findings from Message, URL, & Advisor agents

    # Timestamps (Timezone-Aware)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Multi-column index for tenant-scoped history queries
    __table_args__ = (
        Index("ix_scans_user_created_at", "user_id", "created_at"),
    )

    # ORM helper properties for automatic BilingualText / BilingualList mapping
    @property
    def summary(self) -> Dict[str, str]:
        return {
            "en": self.summary_en or "",
            "ur": self.summary_ur or "",
        }

    @property
    def recommendations(self) -> Dict[str, List[str]]:
        return {
            "en": self.recommendations_en or [],
            "ur": self.recommendations_ur or [],
        }
