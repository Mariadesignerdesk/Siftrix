import base64
import logging
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings
from app.schemas.scan import validate_url_for_ssrf

logger = logging.getLogger(__name__)

VT_BASE_URL = "https://www.virustotal.com/api/v3"


class VirusTotalClient:
    """Async client for VirusTotal API v3 with SSRF defense, rate-limit and status handling."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.VIRUSTOTAL_API_KEY
        self.timeout = settings.VIRUSTOTAL_TIMEOUT

    @property
    def is_configured(self) -> bool:
        """Check if an active API key is available."""
        if not self.api_key:
            return False
        cleaned = self.api_key.strip()
        return bool(cleaned and cleaned != "your_virustotal_api_key_here")

    @property
    def headers(self) -> Dict[str, str]:
        """Headers required for VirusTotal API v3."""
        return {
            "x-apikey": self.api_key.strip() if self.api_key else "",
            "Accept": "application/json",
        }

    @staticmethod
    def encode_url_identifier(url: str) -> str:
        """VirusTotal v3 requires URL identifiers to be base64url encoded without padding."""
        return base64.urlsafe_b64encode(url.strip().encode()).decode().rstrip("=")

    async def get_url_report(self, url: str) -> Dict[str, Any]:
        """Fetch URL analysis report from VirusTotal v3 after performing SSRF validation."""
        # 1. SSRF pre-validation
        try:
            validated_url = validate_url_for_ssrf(url)
        except ValueError as e:
            logger.warning(f"VirusTotal pre-check: URL blocked by SSRF policy: {e}")
            return {
                "status": "blocked",
                "is_fallback": True,
                "provider": "virustotal",
                "message": f"URL blocked by security policy: {e}",
                "malicious": None,
                "suspicious": None,
                "harmless": None,
                "undetected": None,
                "reputation": None,
            }

        # 2. Check configuration
        if not self.is_configured:
            logger.info("VirusTotal API key not configured. Marking provider as unavailable.")
            return {
                "status": "unavailable",
                "is_fallback": True,
                "provider": "virustotal",
                "message": "VirusTotal API key is not configured; external threat intelligence is unavailable.",
                "malicious": None,
                "suspicious": None,
                "harmless": None,
                "undetected": None,
                "reputation": None,
            }

        url_id = self.encode_url_identifier(validated_url)
        endpoint = f"{VT_BASE_URL}/urls/{url_id}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(endpoint, headers=self.headers)

                # If URL not previously analyzed, submit it for scanning
                if response.status_code == 404:
                    return await self.submit_url_scan(validated_url)

                if response.status_code == 429:
                    logger.warning("VirusTotal API rate limit reached (HTTP 429).")
                    return {
                        "status": "rate_limited",
                        "is_fallback": True,
                        "provider": "virustotal",
                        "message": "VirusTotal API rate limit reached (HTTP 429).",
                        "rate_limited": True,
                        "malicious": None,
                        "suspicious": None,
                        "harmless": None,
                        "undetected": None,
                        "reputation": None,
                    }

                response.raise_for_status()
                data = response.json()
                attributes = data.get("data", {}).get("attributes", {})
                
                # Check if analysis is still in progress on VirusTotal
                analysis_status = attributes.get("status")
                if analysis_status in ("queued", "in-progress"):
                    return {
                        "status": "pending",
                        "is_fallback": False,
                        "provider": "virustotal",
                        "message": "URL analysis is currently queued or in-progress on VirusTotal.",
                        "malicious": None,
                        "suspicious": None,
                        "harmless": None,
                        "undetected": None,
                        "reputation": None,
                    }

                stats = attributes.get("last_analysis_stats", {})

                return {
                    "status": "completed",
                    "is_fallback": False,
                    "provider": "virustotal",
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "harmless": stats.get("harmless", 0),
                    "undetected": stats.get("undetected", 0),
                    "reputation": attributes.get("reputation", 0),
                    "rate_limited": False,
                }

            except httpx.TimeoutException as e:
                logger.error(f"VirusTotal request timed out: {e}")
                return {
                    "status": "unavailable",
                    "is_fallback": True,
                    "provider": "virustotal",
                    "message": "VirusTotal request timed out.",
                    "malicious": None,
                    "suspicious": None,
                    "harmless": None,
                    "undetected": None,
                    "reputation": None,
                }
            except httpx.HTTPStatusError as e:
                logger.error(f"VirusTotal API HTTP error: {e.response.status_code}")
                is_rate_limited = e.response.status_code == 429
                return {
                    "status": "rate_limited" if is_rate_limited else "unavailable",
                    "is_fallback": True,
                    "provider": "virustotal",
                    "message": f"VirusTotal API HTTP {e.response.status_code}",
                    "rate_limited": is_rate_limited,
                    "malicious": None,
                    "suspicious": None,
                    "harmless": None,
                    "undetected": None,
                    "reputation": None,
                }
            except Exception as e:
                logger.error(f"VirusTotal request failed: {e}")
                return {
                    "status": "unavailable",
                    "is_fallback": True,
                    "provider": "virustotal",
                    "message": f"VirusTotal request error: {e}",
                    "malicious": None,
                    "suspicious": None,
                    "harmless": None,
                    "undetected": None,
                    "reputation": None,
                }

    async def submit_url_scan(self, url: str) -> Dict[str, Any]:
        """Submit URL for a fresh scan on VirusTotal. Returns pending status."""
        endpoint = f"{VT_BASE_URL}/urls"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(endpoint, headers=self.headers, data={"url": url.strip()})
                if response.status_code == 429:
                    logger.warning("VirusTotal submission rate limited (HTTP 429).")
                    return {
                        "status": "rate_limited",
                        "is_fallback": True,
                        "provider": "virustotal",
                        "message": "VirusTotal submission rate limit reached (HTTP 429).",
                        "rate_limited": True,
                        "malicious": None,
                        "suspicious": None,
                        "harmless": None,
                        "undetected": None,
                        "reputation": None,
                    }

                response.raise_for_status()
                data = response.json()
                analysis_id = data.get("data", {}).get("id")
                return {
                    "status": "pending",
                    "is_fallback": False,
                    "provider": "virustotal",
                    "message": "URL submitted for scanning; analysis is pending on VirusTotal.",
                    "analysis_id": analysis_id,
                    "malicious": None,
                    "suspicious": None,
                    "harmless": None,
                    "undetected": None,
                    "reputation": None,
                }
            except Exception as e:
                logger.warning(f"Failed to submit URL to VirusTotal: {e}")
                return {
                    "status": "unavailable",
                    "is_fallback": True,
                    "provider": "virustotal",
                    "message": f"VirusTotal submission failed: {e}",
                    "malicious": None,
                    "suspicious": None,
                    "harmless": None,
                    "undetected": None,
                    "reputation": None,
                }


virustotal_client = VirusTotalClient()
