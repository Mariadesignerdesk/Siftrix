"""Message Analysis Agent for Siftrix phishing and social engineering detection."""
import logging
import re
from typing import List, Dict, Any, Optional

from app.agents.base import BaseAgent, detect_prompt_injection, sanitize_and_quarantine
from app.schemas.scan import MessageAgentFinding
from app.services.gemini import gemini_client

logger = logging.getLogger(__name__)

# URL extraction pattern from text
URL_REGEX = re.compile(
    r"(?:https?://|www\.)[^\s<>'\"`]+|(?:bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly)/[^\s<>'\"`]+",
    re.IGNORECASE,
)

# Rule-based detection keywords and patterns for exact PhishGuard Build Guide scoring
INDICATOR_PATTERNS = {
    "credential_request": re.compile(
        r"\b(otp|one[-\s]?time\s+password|pin\b|password|login\s+code|cnic|cvv|atm\s+pin|"
        r"card\s+details|credit\s+card|debit\s+card|security\s+code|secret\s+key)\b",
        re.IGNORECASE,
    ),
    "urgency_threat": re.compile(
        r"\b(urgent|immediately|within\s+24\s+hours|account\s+(will\s+be\s+)?(blocked|suspended|frozen|deactivated)|"
        r"legal\s+action|police\s+fir|arrest\s+warrant|sim\s+block|final\s+warning|expire\s+today)\b",
        re.IGNORECASE,
    ),
    "unrealistic_prize_job": re.compile(
        r"\b(lottery|prize|jeeto\s+pakistan|inam\s+nikla|you\s+have\s+won|you\s+won|"
        r"bisp\s+grant|free\s+money|lucky\s+draw|inheritance|earn\s+daily\s+\d+|unclaimed\s+funds)\b",
        re.IGNORECASE,
    ),
    "payment_transfer": re.compile(
        r"\b(transfer\s+(fee|money|funds)|processing\s+fee|advance\s+(fee|deposit|payment)|"
        r"pay\s+now|deposit\s+money|customs\s+clearance|send\s+money\s+to|registration\s+charges)\b",
        re.IGNORECASE,
    ),
    "impersonation": re.compile(
        r"\b(hbl|ubl|meezan|bank\s+alfalah|mcb|standard\s+chartered|state\s+bank|sbp|"
        r"fbr|nadra|bisp|jazzcash|easypaisa|nayapay|sadapay|pakistan\s+post|tcs|leopards|"
        r"netflix|microsoft|google\s+support|whatsapp\s+support)\b",
        re.IGNORECASE,
    ),
}

# Exact PhishGuard Build Guide Indicator Weights
MESSAGE_INDICATOR_WEIGHTS: Dict[str, float] = {
    "credential_request": 30.0,
    "urgency_threat": 15.0,
    "unrealistic_prize_job": 20.0,
    "payment_transfer": 20.0,
    "impersonation": 10.0,
    "suspicious_link": 10.0,
}


class MessageAnalysisAgent(BaseAgent):
    """Analyzes message content for phishing lures and social engineering indicators."""

    def __init__(self):
        super().__init__(name="MessageAnalysisAgent")

    def extract_urls(self, text: str) -> List[str]:
        """Extract all embedded HTTP/HTTPS and shortened links from text."""
        if not text or not isinstance(text, str):
            return []
        raw_matches = URL_REGEX.findall(text)
        urls: List[str] = []
        for m in raw_matches:
            cleaned = m.strip().rstrip(".,;:!?)")
            if cleaned and not cleaned.startswith("http://") and not cleaned.startswith("https://"):
                cleaned = f"https://{cleaned}"
            if cleaned and cleaned not in urls:
                urls.append(cleaned)
        return urls

    async def analyze(self, content: str, sender: Optional[str] = None) -> MessageAgentFinding:
        """Execute deterministic indicator evaluation and optional Gemini enrichment."""
        content_text = content or ""
        sender_text = sender or ""
        combined_text = f"{sender_text} {content_text}".strip()

        # 1. Prompt Injection Inspection
        is_injection_detected = detect_prompt_injection(content_text)

        # 2. Extract Embedded Links
        embedded_urls = self.extract_urls(content_text)

        # 3. Deterministic Indicator Evaluation with Strict Deduplication
        # Each indicator key contributes at most once, regardless of repetition
        active_indicators = set()

        for key, pattern in INDICATOR_PATTERNS.items():
            if pattern.search(combined_text):
                active_indicators.add(key)

        # Suspicious link indicator is triggered if embedded links are present
        if embedded_urls:
            active_indicators.add("suspicious_link")

        # Calculate exact deterministic score from unique active indicator keys
        deterministic_score = sum(MESSAGE_INDICATOR_WEIGHTS[k] for k in active_indicators)
        deterministic_score = min(deterministic_score, 100.0)

        # Map to boolean finding flags
        credential_harvesting_detected = "credential_request" in active_indicators
        urgency_detected = "urgency_threat" in active_indicators
        impersonation_detected = "impersonation" in active_indicators

        # Build descriptive indicator labels
        indicator_labels: List[str] = []
        if "credential_request" in active_indicators:
            indicator_labels.append("Sensitive credential or personal identity data requested (+30)")
        if "urgency_threat" in active_indicators:
            indicator_labels.append("Artificial urgency, deadline, or punitive threat detected (+15)")
        if "unrealistic_prize_job" in active_indicators:
            indicator_labels.append("Unrealistic prize, lottery, or unsolicited financial grant lure (+20)")
        if "payment_transfer" in active_indicators:
            indicator_labels.append("Advance fee, transfer charge, or money request detected (+20)")
        if "impersonation" in active_indicators:
            indicator_labels.append("Impersonation of trusted financial, government, or courier institution (+10)")
        if "suspicious_link" in active_indicators:
            indicator_labels.append("Embedded link or external call-to-action detected (+10)")

        if is_injection_detected:
            indicator_labels.append("Adversarial prompt injection attempt detected: text contains command override directives")

        # Determine sentiment
        sentiment = "neutral"
        if urgency_detected:
            sentiment = "alarmist"
        elif "unrealistic_prize_job" in active_indicators:
            sentiment = "enticing"
        elif impersonation_detected:
            sentiment = "official-impersonation"

        # 4. Optional Gemini Enrichment (Strictly for descriptions/sentiment; NEVER overrides score)
        if gemini_client.is_configured:
            try:
                quarantined_prompt = (
                    f"Analyze the following message for social engineering cues.\n"
                    f"{sanitize_and_quarantine(content_text)}\n\n"
                    f"Return a structured JSON with: sentiment (string), summary_notes (string)."
                )
                gemini_res = await gemini_client.analyze_threat(quarantined_prompt)
                if not gemini_res.get("is_fallback") and isinstance(gemini_res.get("sentiment"), str):
                    sentiment = gemini_res["sentiment"]
            except Exception as e:
                logger.warning(f"[{self.name}] Gemini enrichment failed (continuing with deterministic findings): {e}")

        # Assemble and validate Pydantic finding (Gemini NEVER modifies deterministic_score)
        return MessageAgentFinding(
            risk_score=float(deterministic_score),
            urgency_detected=urgency_detected,
            impersonation_detected=impersonation_detected,
            credential_harvesting_detected=credential_harvesting_detected,
            sentiment=sentiment,
            indicators=indicator_labels,
        )


message_agent = MessageAnalysisAgent()
