"""Message Analysis Agent for Siftrix phishing and social engineering detection."""
import asyncio
import logging
import re
import urllib.parse
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

# Recognized web conferencing hosts exempt from external phishing link classification
MEETING_HOSTS = {
    "meet.google.com",
    "teams.microsoft.com",
    "teams.live.com",
    "zoom.us",
    "webex.com",
}

# Defensive advisory and legitimate informational communication patterns
CREDENTIAL_TOKENS = (
    r"(?:otp|one[-\s]?time\s+password|pin\b|password|login\s+code|cnic|cvv|atm\s+pin|"
    r"card\s+details|credit\s+card|debit\s+card|security\s+code|secret\s+key|credentials|code)"
)
CREDENTIAL_LIST = rf"(?:{CREDENTIAL_TOKENS}(?:\s*(?:,|/|or|and)\s*{CREDENTIAL_TOKENS})*)"

DEFENSIVE_CREDENTIAL_WARNING = re.compile(
    rf"\b(?:never|do\s+not|don't)\s+(?:share|provide|disclose|give|send|enter|reveal)\s+(?:your\s+)?"
    rf"{CREDENTIAL_LIST}\b",
    re.IGNORECASE,
)

DEFENSIVE_INSTITUTION_NEVER_ASKS = re.compile(
    rf"\b(?:bank|hbl|ubl|meezan|bank\s+alfalah|alfalah|mcb|standard\s+chartered|sbp|state\s+bank|fbr|nadra|bisp|easypaisa|jazzcash|nayapay|sadapay|we)\s+"
    rf"(?:never|will\s+never|does\s+not|never\s+calls\s+to)\s+(?:ask|call|request|demand)\s+(?:for\s+)?"
    rf"(?:your\s+)?{CREDENTIAL_LIST}\b",
    re.IGNORECASE,
)

DEFENSIVE_ADVISORY_HEADER = re.compile(
    r"\b(?:hbl|ubl|meezan|bank\s+alfalah|alfalah|mcb|standard\s+chartered|state\s+bank|sbp|"
    r"fbr|nadra|bisp|jazzcash|easypaisa|nayapay|sadapay|pakistan\s+post|tcs|leopards|"
    r"netflix|microsoft|google|whatsapp)\s+(?:security\s+advisory|advisory|security\s+alert|safety\s+tip|public\s+advisory)\b",
    re.IGNORECASE,
)

DEFENSIVE_URGENCY_WARNING = re.compile(
    r"\b(?:beware\s+of|watch\s+out\s+for|caution\s+against|ignore|do\s+not\s+(?:trust|fall\s+for|respond\s+to)|be\s+aware\s+of)\s+"
    r"(?:(?:urgent|fake|fraudulent|suspicious|unsolicited|scam)\s+(?:calls?|sms|messages?|emails?|links?|threats?|callers?)"
    r"(?:\s+(?:claiming|stating|saying|alleging)\s+(?:that\s+)?(?:your\s+)?(?:account|sim)\s+(?:will\s+be\s+|is\s+)?(?:blocked|suspended|frozen|deactivated))?"
    r"|(?:calls?|sms|messages?|emails?|links?|threats?|callers?)\s+(?:claiming|stating|saying|alleging)\s+(?:that\s+)?(?:your\s+)?(?:account|sim)\s+(?:will\s+be\s+|is\s+)?(?:blocked|suspended|frozen|deactivated))\b",
    re.IGNORECASE,
)

DEFENSIVE_AGAINST_SHARING = re.compile(
    r"\b(?:beware\s+of|caution|advisory|safety\s+tip|security\s+alert|be\s+aware|stay\s+safe)[\s\S]*?"
    r"(?:fraud|scam|phishing|fake\s+calls|fake\s+sms)\b",
    re.IGNORECASE,
)

INFORMATIONAL_DOC_PATTERNS = re.compile(
    r"\b(?:how\s+to\s+reset|documentation|guide\s+to|learn\s+more\s+about|faq|knowledge\s+base)\b",
    re.IGNORECASE,
)

# Active phishing lures: soliciting user credentials or action to unblock/verify
ACTIVE_HARVEST_SOLICITATION = re.compile(
    r"\b(?:"
    r"(?:click\s+(?:here|below|the\s+link)|visit|go\s+to|log\s*in\s+(?:at|to|here)|sign\s*in\s+(?:at|to|here))\s+to\s+(?:login|sign\s*in|verify|unblock|unlock|reactivate|restore|update|claim|secure|confirm)\b|"
    r"(?:verify|update|confirm|unblock|reactivate)\s+(?:your\s+)?(?:account|identity|details|cnic|card|access|otp|password|pin|credentials)\s+(?:at|now|here|immediately|within|to)\b|"
    r"(?:enter|provide|submit|input|type)\s+(?:your\s+)?(?:otp|password|pin|cnic|cvv|atm\s*pin|code|credentials)\b"
    r")",
    re.IGNORECASE,
)

# Direct prompt soliciting user credentials
CREDENTIAL_PROMPT = re.compile(
    r"\b(?:enter|provide|submit|send|type|input|fill\s*in|verify|confirm|update)\s+(?:your\s+)?(?:otp|one[-\s]?time\s+password|password|pin|cnic|cvv|atm\s*pin|code|credentials|security\s*code)\b",
    re.IGNORECASE,
)


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

    @staticmethod
    def is_meeting_url(url: str) -> bool:
        """Check if a URL belongs to a recognized web conferencing service."""
        try:
            parsed = urllib.parse.urlparse(url)
            host = (parsed.hostname or "").lower()
            if not host:
                return False
            for mh in MEETING_HOSTS:
                if host == mh or host.endswith(f".{mh}"):
                    return True
            return False
        except Exception:
            return False

    @staticmethod
    def is_defensive_or_informational(text: str) -> bool:
        """Determine if text is a defensive advisory or legitimate informational message.

        Evaluates conservative defensive indicators while verifying that active
        credential harvesting solicitation directives are not present.
        """
        is_defensive = bool(
            DEFENSIVE_CREDENTIAL_WARNING.search(text)
            or DEFENSIVE_INSTITUTION_NEVER_ASKS.search(text)
            or DEFENSIVE_AGAINST_SHARING.search(text)
            or INFORMATIONAL_DOC_PATTERNS.search(text)
            or DEFENSIVE_URGENCY_WARNING.search(text)
            or DEFENSIVE_ADVISORY_HEADER.search(text)
        )
        if not is_defensive:
            return False

        # Defensive wording must not exempt a message that also contains an actual credential-harvesting solicitation.
        # Strip legitimate defensive warnings first so that warnings like "never share your OTP"
        # or "we will never ask for your password" do not falsely trigger solicitation checks.
        cleaned = DEFENSIVE_CREDENTIAL_WARNING.sub("", text)
        cleaned = DEFENSIVE_INSTITUTION_NEVER_ASKS.sub("", cleaned)
        cleaned = DEFENSIVE_URGENCY_WARNING.sub("", cleaned)
        cleaned = DEFENSIVE_ADVISORY_HEADER.sub("", cleaned)

        # Check if attacker included active harvest solicitation directives
        if ACTIVE_HARVEST_SOLICITATION.search(cleaned):
            return False

        # Check if text prompts user to enter/provide/verify credentials
        if CREDENTIAL_PROMPT.search(cleaned):
            return False

        return True

    async def analyze(self, content: str, sender: Optional[str] = None) -> MessageAgentFinding:
        """Execute deterministic indicator evaluation and optional Gemini enrichment."""
        content_text = content or ""
        sender_text = sender or ""
        combined_text = f"{sender_text} {content_text}".strip()

        # 1. Prompt Injection Inspection
        is_injection_detected = detect_prompt_injection(content_text)

        # 2. Extract Embedded Links
        embedded_urls = self.extract_urls(content_text)

        # 3. Context-Aware Deterministic Indicator Evaluation with Strict Deduplication
        # Each indicator key contributes at most once, regardless of repetition
        active_indicators = set()

        is_defensive = self.is_defensive_or_informational(combined_text)

        # Context-aware credential harvesting evaluation:
        # Strip legitimate defensive warnings (e.g. "never share your OTP", "bank will never ask for password or OTP")
        cred_eval_text = DEFENSIVE_CREDENTIAL_WARNING.sub("", combined_text)
        cred_eval_text = DEFENSIVE_INSTITUTION_NEVER_ASKS.sub("", cred_eval_text)
        if INDICATOR_PATTERNS["credential_request"].search(cred_eval_text):
            active_indicators.add("credential_request")

        # Context-aware urgency/threat evaluation:
        # Strip defensive warnings warning against scam urgency (e.g. "beware of urgent calls claiming your account will be blocked")
        urg_eval_text = DEFENSIVE_URGENCY_WARNING.sub("", combined_text)
        if INDICATOR_PATTERNS["urgency_threat"].search(urg_eval_text):
            active_indicators.add("urgency_threat")

        # Context-aware impersonation evaluation:
        # In confirmed defensive advisories, institutional headers and official domains are not impersonation lures
        if is_defensive:
            imp_eval_text = DEFENSIVE_ADVISORY_HEADER.sub("", combined_text)
            imp_eval_text = DEFENSIVE_INSTITUTION_NEVER_ASKS.sub("", imp_eval_text)
            imp_eval_text = URL_REGEX.sub("", imp_eval_text)
            if INDICATOR_PATTERNS["impersonation"].search(imp_eval_text):
                active_indicators.add("impersonation")
        else:
            if INDICATOR_PATTERNS["impersonation"].search(combined_text):
                active_indicators.add("impersonation")

        if INDICATOR_PATTERNS["unrealistic_prize_job"].search(combined_text):
            active_indicators.add("unrealistic_prize_job")

        if INDICATOR_PATTERNS["payment_transfer"].search(combined_text):
            active_indicators.add("payment_transfer")

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

        # Phase 3: Conditional Credential-Phishing Risk Floor
        # Raise deterministic score to a minimum of 70.0 ONLY when ALL 4 conditions are met:
        # 1. Credential harvesting is detected ("credential_request" in active_indicators)
        # 2. Urgency/threat is detected ("urgency_threat" in active_indicators)
        # 3. At least one external URL is extracted (excluding web conferencing URLs)
        # 4. Message is not a defensive advisory or legitimate informational communication
        has_external_url = bool(embedded_urls) and any(not self.is_meeting_url(u) for u in embedded_urls)

        applied_phishing_floor = False
        if (
            credential_harvesting_detected
            and urgency_detected
            and has_external_url
            and not is_defensive
        ):
            deterministic_score = max(deterministic_score, 70.0)
            applied_phishing_floor = True

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
        if applied_phishing_floor:
            indicator_labels.append("Critical credential phishing attack pattern detected: urgent credential harvesting via external link (+floor 70)")

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
                gemini_res = await asyncio.wait_for(
                    gemini_client.analyze_threat(quarantined_prompt),
                    timeout=3.0,
                )
                if not gemini_res.get("is_fallback") and isinstance(gemini_res.get("sentiment"), str):
                    sentiment = gemini_res["sentiment"]
            except asyncio.CancelledError:
                raise
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
