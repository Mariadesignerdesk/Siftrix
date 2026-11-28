"""AI Orchestrator coordinating specialized intelligence agents and deterministic risk scoring."""
import asyncio
import ipaddress
import logging
import re
import urllib.parse
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Set

from app.agents.base import detect_prompt_injection
from app.agents.message_agent import message_agent, MessageAnalysisAgent
from app.agents.url_agent import (
    url_agent,
    SHORTENER_DOMAINS,
    SUSPICIOUS_TLDS,
    is_official_brand_domain,
    VERIFIED_OFFICIAL_BRAND_DOMAINS,
)
from app.agents.advisor_agent import security_advisor
from app.schemas.common import (
    TargetType,
    Verdict,
    RiskLevel,
    BilingualList,
    SAFE_MAX_SCORE,
    LOW_RISK_MAX_SCORE,
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

MAX_EVALUATED_URLS = 3


def calculate_url_priority(url_str: str, detected_brands: Set[str]) -> int:
    """Calculate deterministic heuristic priority score for ranking embedded URLs.

    Higher scores indicate higher risk and earlier evaluation order:
      - Authority user-info (@ symbol): +50
      - Explicit IP address host: +40
      - URL shortener domain: +30
      - Untrusted brand lookalike domain: +25
      - Suspicious / high-abuse TLD: +15
      - Plain HTTP scheme: +5
      - Baseline score: +1
      - Official brand verified domain: -10
    """
    priority = 1
    try:
        parsed = urllib.parse.urlparse(url_str if "://" in url_str else f"http://{url_str}")
        raw_netloc = parsed.netloc or ""
        scheme = (parsed.scheme or "").lower()
        host = (parsed.hostname or "").lower().strip(".")
    except Exception:
        return priority

    # 1. Authority user-info (@ symbol)
    if "@" in raw_netloc:
        priority += 50

    # 2. Explicit IP address host
    if host:
        try:
            ipaddress.ip_address(host)
            priority += 40
        except ValueError:
            pass

    # 3. Known URL shorteners
    if host in SHORTENER_DOMAINS:
        priority += 30

    # 4. Brand trust & lookalike evaluation
    is_trusted = False
    if detected_brands and host:
        for brand in detected_brands:
            if is_official_brand_domain(host, brand):
                is_trusted = True
                break

    if is_trusted:
        priority -= 10
    else:
        # Check if the host is an untrusted brand lookalike
        hostname_labels = host.split(".")
        brands_to_check = detected_brands if detected_brands else set(VERIFIED_OFFICIAL_BRAND_DOMAINS.keys())
        is_lookalike = False
        for brand in brands_to_check:
            has_brand_label = any(
                lbl == brand or lbl.startswith(f"{brand}-") or lbl.endswith(f"-{brand}")
                for lbl in hostname_labels
            )
            if has_brand_label and not is_official_brand_domain(host, brand):
                is_lookalike = True
                break

        if is_lookalike:
            priority += 25

    # 5. Suspicious / high-abuse TLDs
    if any(host.endswith(tld) for tld in SUSPICIOUS_TLDS):
        priority += 15

    # 6. Unencrypted HTTP scheme
    if scheme == "http":
        priority += 5

    return priority


def sanitize_host_for_log(url_str: str) -> str:
    """Extract and sanitize host for privacy-safe logging without paths, queries, or control chars.
    Preserves valid IPv6 colons while stripping control characters, user-info, ports, and queries.
    """
    try:
        parsed = urllib.parse.urlparse(url_str if "://" in url_str else f"http://{url_str}")
        host = parsed.hostname or "unknown"
        # Preserve alphanumeric, dot, hyphen, and IPv6 colon ([^\w.:-])
        return re.sub(r"[^\w.:-]", "", host)[:64]
    except Exception:
        return "unknown"


def classify_risk(score: float) -> tuple[RiskLevel, Verdict]:
    """Map deterministic score to RiskLevel and Verdict.

    Boundaries:
      0.0:          LOW    / SAFE
      0.1 - 29.9:   LOW    / SUSPICIOUS
      30.0 - 59.9:  MEDIUM / SUSPICIOUS
      60.0 - 69.9:  HIGH   / SUSPICIOUS
      70.0 - 89.9:  HIGH   / MALICIOUS
      90.0 - 100.0: CRITICAL / MALICIOUS
    """
    if score <= SAFE_MAX_SCORE:
        return RiskLevel.LOW, Verdict.SAFE
    elif score <= LOW_RISK_MAX_SCORE:
        return RiskLevel.LOW, Verdict.SUSPICIOUS
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
        # Multi-URL Accounting metrics
        attempted_urls_count = 0
        fully_inspected_urls_count = 0
        policy_blocked_urls_count = 0
        partially_inspected_urls_count = 0
        failed_url_evaluations_count = 0
        unevaluated_external_urls_count = 0
        duplicate_urls_count = 0
        excluded_meeting_urls_count = 0

        prioritized_urls: List[str] = []
        url_evaluations: List[Dict[str, Any]] = []

        if target_type == TargetType.URL:
            # Standalone URL scan
            attempted_urls_count = 1
            sanitized_standalone_host = sanitize_host_for_log(content_text)
            prioritized_urls = [sanitized_standalone_host]
            try:
                url_finding = await self.url_agent.analyze(content_text)
                overall_score = url_finding.risk_score
                if url_finding.validation_status == "validated" and url_finding.reputation_status == "completed":
                    fully_inspected_urls_count = 1
                elif url_finding.validation_status == "blocked" and url_finding.reputation_status == "blocked":
                    policy_blocked_urls_count = 1
                else:
                    partially_inspected_urls_count = 1
                url_evaluations.append({
                    "domain": url_finding.domain,
                    "risk_score": url_finding.risk_score,
                    "validation_status": url_finding.validation_status,
                    "reputation_status": url_finding.reputation_status,
                })
            except (TimeoutError, asyncio.TimeoutError, ConnectionError) as op_err:
                failed_url_evaluations_count = 1
                logger.warning(
                    f"[Orchestrator] URL evaluation operational failure for host={sanitized_standalone_host}: {type(op_err).__name__}"
                )
                url_evaluations.append({
                    "domain": sanitized_standalone_host,
                    "status": "failed",
                    "error_type": type(op_err).__name__,
                })
                overall_score = 0.0

        else:
            # Message or Email scan
            message_finding = await self.message_agent.analyze(content_text, sender=sender)
            overall_score = message_finding.risk_score

            # Check for embedded URLs in message content
            # Extract raw matches directly to accurately count duplicates before normalization
            raw_regex_matches = re.findall(
                r"(?:https?://|www\.)[^\s<>'\"`]+|(?:bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly)/[^\s<>'\"`]+",
                content_text,
                re.IGNORECASE,
            )
            cleaned_raw_urls: List[str] = []
            for m in raw_regex_matches:
                cleaned = m.strip().rstrip(".,;:!?)")
                if cleaned and not cleaned.startswith("http://") and not cleaned.startswith("https://"):
                    cleaned = f"https://{cleaned}"
                if cleaned:
                    cleaned_raw_urls.append(cleaned)

            all_raw_urls = cleaned_raw_urls if cleaned_raw_urls else self.message_agent.extract_urls(content_text)
            detected_brands = set(self.message_agent.extract_detected_brands(content_text))

            # Deduplicate preserving order
            seen_urls = set()
            unique_urls: List[str] = []
            for u in all_raw_urls:
                if u in seen_urls:
                    duplicate_urls_count += 1
                else:
                    seen_urls.add(u)
                    unique_urls.append(u)

            # Separate conferencing/meeting URLs from external candidates
            external_candidates: List[str] = []
            for u in unique_urls:
                if self.message_agent.is_meeting_url(u):
                    excluded_meeting_urls_count += 1
                else:
                    external_candidates.append(u)

            # Stable sort external candidates using calculate_url_priority (highest priority first)
            # Python's sort is stable: elements with equal priority preserve their original appearance order
            prioritized_external = sorted(
                external_candidates,
                key=lambda u: calculate_url_priority(u, detected_brands),
                reverse=True,
            )

            # Evaluate top candidates up to MAX_EVALUATED_URLS (3)
            evaluated_urls = prioritized_external[:MAX_EVALUATED_URLS]
            unevaluated_urls = prioritized_external[MAX_EVALUATED_URLS:]
            unevaluated_external_urls_count = len(unevaluated_urls)
            # Store only sanitized hostnames to prevent leaking sensitive paths, tokens, or queries
            prioritized_urls = [sanitize_host_for_log(u) for u in (evaluated_urls + unevaluated_urls)]
            extracted_urls = all_raw_urls

            # Iteratively evaluate top URLs with strict operational failure isolation
            evaluated_findings: List[URLAgentFinding] = []
            for candidate_url in evaluated_urls:
                attempted_urls_count += 1
                try:
                    f = await self.url_agent.analyze(candidate_url)
                    evaluated_findings.append(f)

                    # Compound scoring: max of message score and any evaluated URL score
                    overall_score = max(overall_score, f.risk_score)

                    # Accounting classification (mutually exclusive)
                    if f.validation_status == "validated" and f.reputation_status == "completed":
                        fully_inspected_urls_count += 1
                    elif f.validation_status == "blocked" and f.reputation_status == "blocked":
                        policy_blocked_urls_count += 1
                    else:
                        partially_inspected_urls_count += 1

                    url_evaluations.append({
                        "domain": f.domain,
                        "risk_score": f.risk_score,
                        "validation_status": f.validation_status,
                        "reputation_status": f.reputation_status,
                    })
                except (TimeoutError, asyncio.TimeoutError, ConnectionError) as op_err:
                    failed_url_evaluations_count += 1
                    sanitized_host = sanitize_host_for_log(candidate_url)
                    logger.warning(
                        f"[Orchestrator] Embedded URL evaluation operational failure for host={sanitized_host}: {type(op_err).__name__}"
                    )
                    url_evaluations.append({
                        "domain": sanitize_host_for_log(candidate_url),
                        "status": "failed",
                        "error_type": type(op_err).__name__,
                    })

            # Pick highest-risk evaluated finding as representative url_finding
            if evaluated_findings:
                url_finding = max(evaluated_findings, key=lambda f: f.risk_score)

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

        # 5b. Append Accurate Bilingual Multi-URL Warnings
        # Warning 1: Policy-blocked URLs (SSRF / internal targets)
        if policy_blocked_urls_count > 0:
            bilingual_recs.en.append(
                f"Caution: {policy_blocked_urls_count} link(s) targeted internal/restricted network addresses and were blocked by security policy."
            )
            bilingual_recs.ur.append(
                f"احتیاط: {policy_blocked_urls_count} لنک اندرونی یا ممنوعہ نیٹ ورک ایڈریس کو نشانہ بنا رہے تھے اور سیکیورٹی پالیسی کے تحت بلاک کر دیے گئے۔"
            )

        # Warning 2: Operational failures (timeout, connection drop)
        if failed_url_evaluations_count > 0:
            bilingual_recs.en.append(
                f"Caution: Analysis for {failed_url_evaluations_count} link(s) could not be completed due to temporary network or service timeout. Exercise high caution before opening them."
            )
            bilingual_recs.ur.append(
                f"احتیاط: نیٹ ورک یا سروس میں عارضی خرابی کے باعث {failed_url_evaluations_count} لنک کی مکمل جانچ نہ ہو سکی۔ ان لنکس کو کھولنے سے گریز کریں۔"
            )

        # Warning 3: Partial inspection / unavailable service
        if partially_inspected_urls_count > 0 and failed_url_evaluations_count == 0:
            bilingual_recs.en.append(
                f"Caution: Security inspection was partially limited for {partially_inspected_urls_count} link(s) due to external reputation service availability."
            )
            bilingual_recs.ur.append(
                f"احتیاط: بیرونی تصدیقی سروس کی عدم دستیابی کے باعث {partially_inspected_urls_count} لنک کا سیکیورٹی معائنہ جزوی رہا۔"
            )

        # Warning 4: Links exceeding inspection cap of 3
        if unevaluated_external_urls_count > 0:
            bilingual_recs.en.append(
                f"Caution: Message contains {len(prioritized_urls)} external links. Only the top {len(evaluated_urls)} priority links were analyzed; {unevaluated_external_urls_count} link(s) remain uninspected. Do not open unverified links."
            )
            bilingual_recs.ur.append(
                f"احتیاط: پیغام میں {len(prioritized_urls)} بیرونی لنکس موجود ہیں۔ صرف اہم ترین {len(evaluated_urls)} لنکس کی جانچ کی گئی جبکہ {unevaluated_external_urls_count} لنکس کی جانچ باقی ہے۔ نامعلوم لنکس کھولنے سے گریز کریں۔"
            )

        # 6. Assemble Structured Agent Findings
        raw_meta = dict(meta)
        raw_meta["prompt_injection_detected"] = is_injection_detected
        raw_meta["extracted_urls"] = [sanitize_host_for_log(u) for u in extracted_urls]
        raw_meta["scoring_engine"] = "phishguard_rule_based"
        raw_meta["url_accounting"] = {
            "attempted_urls_count": attempted_urls_count,
            "fully_inspected_urls_count": fully_inspected_urls_count,
            "policy_blocked_urls_count": policy_blocked_urls_count,
            "partially_inspected_urls_count": partially_inspected_urls_count,
            "failed_url_evaluations_count": failed_url_evaluations_count,
            "unevaluated_external_urls_count": unevaluated_external_urls_count,
            "duplicate_urls_count": duplicate_urls_count,
            "excluded_meeting_urls_count": excluded_meeting_urls_count,
            "prioritized_urls": prioritized_urls,
            "evaluated_urls": url_evaluations,
        }

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
