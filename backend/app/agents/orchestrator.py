"""AI Orchestrator coordinating specialized intelligence agents and deterministic risk scoring."""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from app.agents.base import detect_prompt_injection
from app.agents.message_agent import message_agent
from app.agents.url_agent import url_agent
from app.agents.advisor_agent import security_advisor
from app.schemas.common import (
    TargetType,
    Verdict,
    RiskLevel,
    SAFE_MAX_SCORE,
    SUSPICIOUS_MAX_SCORE,
    HIGH_RISK_MAX_SCORE,
)
from app.schemas.scan import (
    ScanResponse,
    StructuredAgentFindings,
    MessageAgentFinding,
    URLAgentFinding,
)

logger = logging.getLogger(__name__)


def classify_risk(score: float) -> tuple[RiskLevel, Verdict]:
    """Map deterministic score to RiskLevel and Verdict.

    Boundaries:
      0.0:          LOW    / SAFE
      0.1 - 59.9:   MEDIUM / SUSPICIOUS
      60.0 - 69.9:  HIGH   / SUSPICIOUS
      70.0 - 89.9:  HIGH   / MALICIOUS
      90.0 - 100.0: CRITICAL / MALICIOUS
    """
    if score <= SAFE_MAX_SCORE:
        return RiskLevel.LOW, Verdict.SAFE
    elif score <= 59.9:
        return RiskLevel.MEDIUM, Verdict.SUSPICIOUS
    elif score <= SUSPICIOUS_MAX_SCORE:
        return RiskLevel.HIGH, Verdict.SUSPICIOUS
    elif score <= HIGH_RISK_MAX_SCORE:
        return RiskLevel.HIGH, Verdict.MALICIOUS
    else:
        return RiskLevel.CRITICAL, Verdict.MALICIOUS


class AIOrchestrator:
    """Central orchestrator executing multi-agent scans, scoring, and response synthesis."""

    def __init__(self):
        self.message_agent = message_agent
        self.url_agent = url_agent
        self.advisor_agent = security_advisor

    async def scan(
        self,
        content: str,
        target_type: TargetType,
        sender: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> ScanResponse:
        """Execute full multi-agent scanning pipeline on user-submitted content."""
        content_text = (content or "").strip()
        meta = metadata or {}
        now = datetime.now(timezone.utc)

        # 1. Independent Prompt Injection Inspection
        is_injection_detected = detect_prompt_injection(content_text)

        message_finding: Optional[MessageAgentFinding] = None
        url_finding: Optional[URLAgentFinding] = None
        extracted_urls: List[str] = []

        # 2. Agent Routing & Execution
        if target_type == TargetType.URL:
            # Standalone URL scan
            url_finding = await self.url_agent.analyze(content_text)
            overall_score = url_finding.risk_score

        else:
            # Message or Email scan
            message_finding = await self.message_agent.analyze(content_text, sender=sender)
            overall_score = message_finding.risk_score

            # Check for embedded URLs in message content
            extracted_urls = self.message_agent.extract_urls(content_text)
            if extracted_urls:
                # Analyze primary embedded link
                primary_url = extracted_urls[0]
                url_finding = await self.url_agent.analyze(primary_url)
                # Compound scoring: max of message score and URL score to prevent dilution
                overall_score = max(overall_score, url_finding.risk_score)

        # 3. Final Score Cap
        overall_score = min(float(overall_score), 100.0)

        # 4. Strict Classification
        risk_level, verdict = classify_risk(overall_score)

        # 5. Security Advisory Synthesis
        advisor_finding, bilingual_summary, bilingual_recs = await self.advisor_agent.advise(
            risk_level=risk_level.value,
            verdict=verdict.value,
            overall_score=overall_score,
            message_finding=message_finding,
            url_finding=url_finding,
            target_content=content_text,
        )

        # 6. Assemble Structured Agent Findings
        raw_meta = dict(meta)
        raw_meta["prompt_injection_detected"] = is_injection_detected
        raw_meta["extracted_urls"] = extracted_urls
        raw_meta["scoring_engine"] = "phishguard_rule_based"

        findings = StructuredAgentFindings(
            message_intelligence=message_finding,
            url_intelligence=url_finding,
            security_advisor=advisor_finding,
            raw_metadata=raw_meta,
        )

        # 7. Assemble Validated ScanResponse (enforcing all Pydantic validators)
        return ScanResponse(
            id=uuid.uuid4(),
            user_id=user_id,
            target_type=target_type,
            target_content=content_text,
            overall_risk_score=round(overall_score, 1),
            verdict=verdict,
            risk_level=risk_level,
            summary=bilingual_summary,
            recommendations=bilingual_recs,
            agent_findings=findings,
            created_at=now,
            updated_at=now,
        )


orchestrator = AIOrchestrator()
