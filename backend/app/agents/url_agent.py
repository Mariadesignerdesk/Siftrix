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

# Unicode TR39-inspired confusable mapping for domain homoglyphs
UNICODE_CONFUSABLES_MAP: Dict[str, str] = {
    # Latin lookalikes
    "\u0251": "a",  # ɑ (Latin small letter alpha) -> a
    "\u0261": "g",  # ɡ (Latin small letter script g) -> g
    "\u0131": "i",  # ı (Latin small letter dotless i) -> i
    # Cyrillic lookalikes
    "\u0430": "a",  # а (Cyrillic small letter a) -> a
    "\u0441": "c",  # с (Cyrillic small letter es) -> c
    "\u0435": "e",  # е (Cyrillic small letter ie) -> e
    "\u0456": "i",  # і (Cyrillic small letter i) -> i
    "\u0458": "j",  # ј (Cyrillic small letter je) -> j
    "\u043e": "o",  # о (Cyrillic small letter o) -> o
    "\u0440": "p",  # р (Cyrillic small letter er) -> p
    "\u0455": "s",  # ѕ (Cyrillic small letter dze) -> s
    "\u0445": "x",  # х (Cyrillic small letter ha) -> x
    "\u0443": "y",  # у (Cyrillic small letter u) -> y
    # Greek lookalikes
    "\u03b1": "a",  # α (Greek small letter alpha) -> a
    "\u03bf": "o",  # ο (Greek small letter omicron) -> o
    "\u03c1": "p",  # ρ (Greek small letter rho) -> p
    "\u03bd": "v",  # ν (Greek small letter nu) -> v
}


def safe_decode_idna_label(label: str) -> str:
    """Safely decode an IDNA/Punycode label (xn--) to Unicode with graceful error fallback."""
    if not label.lower().startswith("xn--"):
        return label
    try:
        return label.encode("ascii").decode("idna")
    except Exception:
        return label


def safe_decode_domain(hostname: str) -> str:
    """Decode all Punycode labels in a hostname to their Unicode representation."""
    if not hostname:
        return ""
    labels = hostname.split(".")
    decoded_labels = [safe_decode_idna_label(lbl) for lbl in labels]
    return ".".join(decoded_labels)


# Verified conservative official domain allowlists for supported protected brands
VERIFIED_OFFICIAL_BRAND_DOMAINS: Dict[str, Set[str]] = {
    "paypal": {"paypal.com", "paypal.me"},
    "google": {"google.com", "google.com.pk", "google.co.uk"},
    "microsoft": {"microsoft.com"},
    "apple": {"apple.com"},
    "amazon": {"amazon.com", "amazon.co.uk"},
    "facebook": {"facebook.com"},
    "netflix": {"netflix.com"},
    "whatsapp": {"whatsapp.com"},
    "hbl": {"hbl.com"},
    "ubl": {"ubldigital.com", "ubl.com.pk"},
    "meezan": {"meezanbank.com"},
    "alfalah": {"bankalfalah.com"},
    "jazzcash": {"jazzcash.com.pk"},
    "easypaisa": {"easypaisa.com.pk"},
    "nayapay": {"nayapay.com"},
    "sadapay": {"sadapay.pk"},
    "nadra": {"nadra.gov.pk"},
    "fbr": {"fbr.gov.pk"},
    "bisp": {"bisp.gov.pk"},
}


def is_official_brand_domain(hostname: str, brand: str) -> bool:
    """Check if hostname is strictly a verified official brand domain or legitimate subdomain.

    Only exact registered domains in VERIFIED_OFFICIAL_BRAND_DOMAINS and their genuine
    subdomains (e.g. login.paypal.com) are excluded.
    Unverified domains (e.g. paypal.org, paypal.net) are NOT assumed official.
    """
    clean_host = hostname.lower().strip(".")
    allowed_domains = VERIFIED_OFFICIAL_BRAND_DOMAINS.get(brand, set())
    for official in allowed_domains:
        if clean_host == official or clean_host.endswith(f".{official}"):
            return True
    return False


def map_confusables(text: str) -> str:
    """Map confusable characters in a string to their ASCII base equivalents."""
    return "".join(UNICODE_CONFUSABLES_MAP.get(ch, ch) for ch in text)


def detect_brand_homoglyph(hostname: str, targeted_brands: List[str] = TARGETED_BRANDS) -> Optional[str]:
    """Detect if a hostname uses Unicode confusables or homoglyphs to impersonate a protected brand.

    Evaluates each decoded domain label independently to prevent cross-label false positives.
    A candidate label must itself contain at least one mapped confusable character,
    and its own skeleton must match a protected brand or an explicitly supported brand-lure pattern.

    Returns the impersonated brand name if a confirmed homoglyph attack is detected, or None.
    """
    if not hostname:
        return None

    decoded_host = safe_decode_domain(hostname.lower().strip("."))
    labels = decoded_host.split(".")

    for label in labels:
        # 1. Candidate label must independently contain at least one mapped confusable
        if not any(ch in UNICODE_CONFUSABLES_MAP for ch in label):
            continue

        # 2. Compute the confusable skeleton for this specific label only
        label_skeleton = map_confusables(label)

        # 3. Check if this label's skeleton matches a protected brand or brand-lure pattern
        for brand in targeted_brands:
            is_match = (
                label_skeleton == brand
                or label_skeleton.startswith(f"{brand}-")
                or label_skeleton.endswith(f"-{brand}")
            )
            if is_match:
                # 4. Verify that the overall hostname is not a verified official brand domain
                if not is_official_brand_domain(decoded_host, brand):
                    return brand

    return None


# Exact PhishGuard Build Guide Indicator Weights
URL_INDICATOR_WEIGHTS: Dict[str, float] = {
    "ip_host": 20.0,
    "url_shortener": 15.0,
    "lookalike_subdomains": 15.0,
    "at_symbol": 15.0,
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

        # 4. @ Symbol Indicator (+15) (Strictly in URL authority component, not path/query)
        has_at_symbol = "@" in (parsed.netloc or "")
        if has_at_symbol:
            active_indicators.add("at_symbol")
            indicator_labels.append("URL authority contains embedded @ symbol credential lure (+15)")

        # 5. Lookalike, Confusables, or Excessive Subdomains Indicator (+15)
        is_typosquatting = False
        homoglyph_brand = detect_brand_homoglyph(hostname)
        if homoglyph_brand:
            is_typosquatting = True
            active_indicators.add("lookalike_subdomains")
            indicator_labels.append(f"Unicode confusable or homoglyph brand impersonation detected targeting '{homoglyph_brand}' (+15)")
        else:
            # Check excessive subdomains (> 3 dots)
            has_excessive_subdomains = hostname.count(".") > 3

            # Check ASCII lookalike brand keywords in domain using label-boundary matching
            ascii_typosquatting = False
            hostname_labels = hostname.split(".")
            for brand in TARGETED_BRANDS:
                # Label matches only if it exactly equals the brand or uses an explicitly supported hyphenated lure pattern
                # (e.g. 'paypal.evil.com', 'paypal-login.com', 'verify-paypal.com')
                # Prevents unconstrained substring collisions like 'public.com' (ubl) or 'pineapple.com' (apple)
                has_brand_label = any(
                    lbl == brand or lbl.startswith(f"{brand}-") or lbl.endswith(f"-{brand}")
                    for lbl in hostname_labels
                )
                if has_brand_label:
                    if not is_official_brand_domain(hostname, brand):
                        ascii_typosquatting = True
                        break

            if has_excessive_subdomains or ascii_typosquatting:
                is_typosquatting = True
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
            validation_status=val_status,
            reputation_status=rep_status,
        )


url_agent = URLSecurityAgent()
