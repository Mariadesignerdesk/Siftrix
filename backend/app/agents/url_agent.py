"""URL Security Agent for Siftrix threat intelligence and URL heuristic analysis."""
import ipaddress
import logging
import re
from typing import Dict, Any, Optional, Set, List
from urllib.parse import urlparse

from app.agents.base import BaseAgent
from app.mcp_server.client import SiftrixMCPClient
from app.schemas.scan import URLAgentFinding

logger = logging.getLogger(__name__)

# Known URL shortener domains
SHORTENER_DOMAINS = {
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "is.gd",
    "cutt.ly",
    "goo.gl",
    "ow.ly",
    "buff.ly",
    "rebrand.ly",
    "tiny.cc",
    "bl.ink",
}

# Suspicious / high-abuse TLDs
SUSPICIOUS_TLDS = {
    ".xyz",
    ".top",
    ".tk",
    ".ml",
    ".ga",
    ".cf",
    ".gq",
    ".buzz",
    ".fit",
    ".work",
    ".cc",
    ".icu",
    ".cam",
    ".surf",
}

# Common targeted brands for lookalike / typosquatting detection
TARGETED_BRANDS = [
    "paypal", "paypa1", "google", "g00gle", "microsoft", "apple", "amazon", "amaz0n",
    "facebook", "faceb00k", "netflix", "whatsapp", "hbl", "ubl", "meezan", "alfalah",
    "jazzcash", "easypaisa", "nayapay", "sadapay", "nadra", "fbr", "bisp",
]

# Exact PhishGuard Build Guide Indicator Weights
URL_INDICATOR_WEIGHTS: Dict[str, float] = {
    "ip_host": 20.0,
    "url_shortener": 15.0,
    "lookalike_subdomains": 15.0,
    "at_symbol_punycode": 15.0,
    "no_https": 10.0,
    "suspicious_tld": 10.0,
}


class URLSecurityAgent(BaseAgent):
    """Inspects URLs using SiftrixMCPClient over stdio and evaluates exact Build Guide heuristics."""

    def __init__(self):
        super().__init__(name="URLSecurityAgent")

    async def analyze(self, url: str) -> URLAgentFinding:
        """Analyze URL threat posture using MCP tools over stdio with decoupled error handling."""
        cleaned_url = (url or "").strip()
        val_status: str = "unavailable"
        rep_status: str = "unavailable"
        ssrf_blocked: bool = False
        val_res: Dict[str, Any] = {}
        rep_res: Dict[str, Any] = {}

        try:
            async with SiftrixMCPClient() as mcp_client:
                # -------------------------------------------------------------
                # 1. URL Validation via MCP over stdio
                # -------------------------------------------------------------
                try:
                    val_res = await mcp_client.call_tool("validate_url", {"url": cleaned_url})
                    if val_res.get("is_error"):
                        val_status = "unavailable"
                    elif val_res.get("is_safe_target") is True:
                        val_status = "validated"
                    elif val_res.get("is_safe_target") is False:
                        val_status = "blocked"
                        ssrf_blocked = True
                    else:
                        val_status = "unavailable"
                except Exception as val_e:
                    logger.error(f"[{self.name}] MCP validate_url call error: {val_e}")
                    val_status = "unavailable"
                    val_res = {"url": cleaned_url, "is_valid": False, "is_safe_target": None, "error": str(val_e)}

                # -------------------------------------------------------------
                # 2. VirusTotal Reputation via MCP over stdio (Decoupled)
                # -------------------------------------------------------------
                if val_status == "validated":
                    try:
                        rep_res = await mcp_client.call_tool("check_url_reputation", {"url": cleaned_url})
                        if rep_res.get("is_error"):
                            rep_status = "unavailable"
                        else:
                            rep_status = rep_res.get("status", "unavailable")
                    except Exception as rep_e:
                        # Decoupled error handling: preserve val_status="validated"
                        logger.error(f"[{self.name}] MCP check_url_reputation call error: {rep_e}. Preserving validation status.")
                        rep_status = "unavailable"
                        rep_res = {
                            "status": "unavailable",
                            "provider": "virustotal",
                            "message": f"Reputation lookup failed: {rep_e}",
                            "malicious": None,
                        }
                elif val_status == "blocked":
                    # Policy blocked by static SSRF check: skip VirusTotal lookup
                    rep_status = "blocked"
                    rep_res = {
                        "status": "blocked",
                        "provider": "virustotal",
                        "message": "URL blocked by static security policy; VirusTotal lookup skipped.",
                        "malicious": None,
                    }
                else:  # val_status == "unavailable"
                    rep_status = "unavailable"
                    rep_res = {
                        "status": "unavailable",
                        "provider": "virustotal",
                        "message": "URL validation unavailable; VirusTotal lookup skipped.",
                        "malicious": None,
                    }

        except Exception as conn_err:
            # Subprocess launch or outer connection failure:
            # Fail safely WITHOUT directly invoking in-process tool functions
            logger.error(f"[{self.name}] MCP client connection error: {conn_err}. Failing safely.")
            val_status = "unavailable"
            rep_status = "unavailable"
            ssrf_blocked = False  # Never conflate MCP subprocess failure with an SSRF block
            val_res = {"url": cleaned_url, "is_valid": False, "is_safe_target": None, "error": f"MCP failure: {conn_err}"}
            rep_res = {
                "status": "unavailable",
                "provider": "virustotal",
                "message": f"MCP failure: external threat intelligence unavailable ({conn_err})",
                "malicious": None,
            }

        return self._evaluate_url_findings(
            url=cleaned_url,
            val_res=val_res,
            rep_res=rep_res,
            val_status=val_status,
            rep_status=rep_status,
            ssrf_blocked=ssrf_blocked,
        )

    def _evaluate_url_findings(
        self,
        url: str,
        val_res: Dict[str, Any],
        rep_res: Dict[str, Any],
        val_status: str,
        rep_status: str,
        ssrf_blocked: bool,
    ) -> URLAgentFinding:
        """Evaluate deterministic URL heuristics and VirusTotal intelligence with deduplication."""
        active_indicators: Set[str] = set()
        indicator_labels: List[str] = []

        try:
            parsed = urlparse(url)
            scheme = (parsed.scheme or "").lower()
            hostname = (parsed.hostname or "").lower()
        except Exception:
            scheme = ""
            hostname = ""

        domain = hostname or "unknown"

        # 1. No HTTPS Indicator (+10)
        if scheme == "http":
            active_indicators.add("no_https")
            indicator_labels.append("Unencrypted HTTP protocol used instead of HTTPS (+10)")

        # 2. IP Host Indicator (+20)
        is_ip = False
        try:
            raw_ip = hostname.strip("[]")
            if raw_ip:
                ipaddress.ip_address(raw_ip)
                is_ip = True
        except ValueError:
            is_ip = False

        if is_ip:
            active_indicators.add("ip_host")
            indicator_labels.append("Explicit IP address used as hostname instead of a registered domain (+20)")

        # 3. URL Shortener Indicator (+15)
        if hostname in SHORTENER_DOMAINS:
            active_indicators.add("url_shortener")
            indicator_labels.append("URL shortener service obfuscating true destination (+15)")

        # 4. @ Symbol or Punycode Indicator (+15)
        has_at_symbol = "@" in url
        has_punycode = "xn--" in hostname
        if has_at_symbol or has_punycode:
            active_indicators.add("at_symbol_punycode")
            indicator_labels.append("URL contains @ symbol credential lure or punycode domain (+15)")

        # 5. Lookalike / Excessive Subdomains Indicator (+15)
        is_typosquatting = False
        # Check excessive subdomains (> 3 dots)
        has_excessive_subdomains = hostname.count(".") > 3

        # Check lookalike brand keywords in domain
        for brand in TARGETED_BRANDS:
            if brand in hostname:
                # If brand is in hostname but hostname does not equal the official brand domain
                if not (hostname == f"{brand}.com" or hostname.endswith(f".{brand}.com") or hostname == f"{brand}.pk"):
                    is_typosquatting = True
                    break

        if has_excessive_subdomains or is_typosquatting:
            active_indicators.add("lookalike_subdomains")
            indicator_labels.append("Typosquatting brand lure or excessive subdomain nesting detected (+15)")

        # 6. Suspicious TLD Indicator (+10)
        suspicious_tld = any(hostname.endswith(tld) for tld in SUSPICIOUS_TLDS)
        if suspicious_tld:
            active_indicators.add("suspicious_tld")
            indicator_labels.append("High-abuse or abnormal top-level domain (TLD) detected (+10)")

        # 7. VirusTotal Scoring (Mutually Exclusive)
        vt_score = 0.0
        vt_malicious = 0
        vt_suspicious = 0

        raw_malicious = rep_res.get("malicious")
        raw_suspicious = rep_res.get("suspicious")

        if rep_status == "completed" and isinstance(raw_malicious, int):
            vt_malicious = raw_malicious
            vt_suspicious = raw_suspicious if isinstance(raw_suspicious, int) else 0

            if vt_malicious >= 5:
                vt_score = 35.0  # Exactly +35 total, never +55
                indicator_labels.append(f"VirusTotal detected {vt_malicious} malicious security engines (+35)")
            elif vt_malicious >= 1:
                vt_score = 20.0  # Exactly +20 total
                indicator_labels.append(f"VirusTotal detected {vt_malicious} malicious security engine(s) (+20)")
        elif rep_status in ("unavailable", "pending", "rate_limited", "blocked") or raw_malicious is None:
            # Unavailable, pending, rate-limited, or blocked: strictly +0
            vt_score = 0.0

        # Calculate exact deterministic score from unique active indicator keys + VT score
        heuristic_score = sum(URL_INDICATOR_WEIGHTS[k] for k in active_indicators)
        total_score = min(heuristic_score + vt_score, 100.0)

        # Record validation status disclaimer in indicators
        if val_status == "validated":
            indicator_labels.append("URL passed static SSRF validation (Note: this does not guarantee the site is phishing-free)")
        elif val_status == "blocked":
            indicator_labels.append("URL targeting internal or restricted network address (SSRF check blocked)")
        elif val_status == "unavailable":
            indicator_labels.append("Static URL validation service unavailable")

        return URLAgentFinding(
            risk_score=float(total_score),
            domain=domain,
            virustotal_malicious_count=vt_malicious,
            virustotal_suspicious_count=vt_suspicious,
            is_typosquatting=is_typosquatting,
            suspicious_tld=suspicious_tld,
            redirect_count=0,
            indicators=indicator_labels,
        )


url_agent = URLSecurityAgent()
