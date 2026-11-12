import asyncio
import json
import logging
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
TRANSIENT_STATUS_CODES = {503, 504}
MAX_RETRIES = 1
DEFAULT_RETRY_DELAY = 1.0


class GeminiClient:
    """Async client for Google Gemini API with bilingual extraction & heuristic fallback."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        retry_delay: float = DEFAULT_RETRY_DELAY,
    ):
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.timeout = timeout if timeout is not None else settings.GEMINI_TIMEOUT
        self.retry_delay = retry_delay

    @property
    def is_configured(self) -> bool:
        """Check if a valid Gemini API key is configured."""
        if not self.api_key:
            return False
        cleaned = self.api_key.strip()
        return bool(cleaned and cleaned != "your_gemini_api_key_here")

    @property
    def headers(self) -> Dict[str, str]:
        """Headers for Google Generative Language API using x-goog-api-key."""
        headers = {"Content-Type": "application/json"}
        if self.api_key and self.api_key.strip():
            headers["x-goog-api-key"] = self.api_key.strip()
        return headers

    async def analyze_threat(self, prompt: str) -> Dict[str, Any]:
        """Send prompt to Gemini requesting structured JSON with English and Roman Urdu explanations."""
        if not self.is_configured:
            logger.info("Gemini API key not configured. Using rule-based fallback.")
            return self._heuristic_fallback(prompt, reason="unconfigured")

        endpoint = f"{GEMINI_API_BASE}/{self.model}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            last_fallback_reason = "error"
            for attempt in range(MAX_RETRIES + 1):
                try:
                    response = await client.post(endpoint, headers=self.headers, json=payload)

                    if response.status_code == 429:
                        logger.warning("Gemini API rate limit reached (HTTP 429). Using heuristic fallback without retry.")
                        return self._heuristic_fallback(prompt, reason="rate_limited")

                    if response.status_code in TRANSIENT_STATUS_CODES:
                        last_fallback_reason = f"http_{response.status_code}"
                        if attempt < MAX_RETRIES:
                            logger.warning(
                                f"Transient Gemini API error (HTTP {response.status_code}). "
                                f"Retrying in {self.retry_delay}s (attempt {attempt + 1}/{MAX_RETRIES})..."
                            )
                            await asyncio.sleep(self.retry_delay)
                            continue
                        logger.error(
                            f"Gemini API request failed after retry with transient HTTP {response.status_code}."
                        )
                        return self._heuristic_fallback(prompt, reason=last_fallback_reason)

                    if response.is_client_error:
                        logger.error(f"Gemini API client error (HTTP {response.status_code}). Not retrying.")
                        return self._heuristic_fallback(prompt, reason=f"http_{response.status_code}")

                    response.raise_for_status()
                    data = response.json()

                    # Validate response candidate structure
                    candidates = data.get("candidates", [])
                    if not candidates:
                        logger.error("Gemini response contained no candidates.")
                        return self._heuristic_fallback(prompt, reason="empty_response")

                    parts = candidates[0].get("content", {}).get("parts", [])
                    if not parts or "text" not in parts[0]:
                        logger.error("Gemini candidate contained no text content.")
                        return self._heuristic_fallback(prompt, reason="empty_parts")

                    raw_text = parts[0]["text"]
                    try:
                        parsed = json.loads(raw_text)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to decode Gemini JSON response: {e}")
                        return self._heuristic_fallback(prompt, reason="invalid_json")

                    # Enrich with actual provider metadata
                    parsed["is_fallback"] = False
                    parsed["provider"] = "gemini"
                    parsed["model"] = self.model
                    return parsed

                except httpx.TimeoutException as e:
                    timeout_type = type(e).__name__
                    last_fallback_reason = "timeout"
                    if attempt < MAX_RETRIES:
                        logger.warning(
                            f"Gemini API request timed out ({timeout_type}). Retrying in {self.retry_delay}s (attempt {attempt + 1}/{MAX_RETRIES})..."
                        )
                        await asyncio.sleep(self.retry_delay)
                        continue
                    logger.error(f"Gemini API request timed out after retry ({timeout_type}): {e}")
                    return self._heuristic_fallback(prompt, reason="timeout")

                except httpx.HTTPStatusError as e:
                    status_code = e.response.status_code
                    if status_code in TRANSIENT_STATUS_CODES and attempt < MAX_RETRIES:
                        logger.warning(
                            f"Transient Gemini API status error (HTTP {status_code}). "
                            f"Retrying in {self.retry_delay}s (attempt {attempt + 1}/{MAX_RETRIES})..."
                        )
                        await asyncio.sleep(self.retry_delay)
                        continue
                    logger.error(f"Gemini API HTTP error: {status_code}")
                    reason = "rate_limited" if status_code == 429 else f"http_{status_code}"
                    return self._heuristic_fallback(prompt, reason=reason)

                except Exception as e:
                    logger.error(f"Gemini API request failed: {e}")
                    return self._heuristic_fallback(prompt, reason=f"error_{type(e).__name__}")

            return self._heuristic_fallback(prompt, reason=last_fallback_reason)

    def _heuristic_fallback(self, prompt: str, reason: str = "fallback") -> Dict[str, Any]:
        """Offline fallback returning valid bilingual JSON structure, clearly marked as fallback."""
        prompt_lower = prompt.lower()
        has_urgency = any(w in prompt_lower for w in ["urgent", "immediately", "suspended", "block", "freeze", "expire"])
        has_banking = any(w in prompt_lower for w in ["bank", "account", "otp", "pin", "card", "hbl", "ubl", "jazzcash", "easypaisa"])

        if has_urgency and has_banking:
            return {
                "risk_score": 85.0,
                "verdict": "malicious",
                "risk_level": "high",
                "summary": {
                    "en": "Urgent financial account warning detected. Likely credential harvesting or scam attempt.",
                    "ur": "Bank account band hone ka farzi darr dikhaya gaya hai. Yeh scam ya password chori karne ki koshish hai.",
                },
                "recommendations": {
                    "en": ["Do not click any provided links.", "Never share OTP or login PIN.", "Contact your bank's official helpline."],
                    "ur": ["Kisi link par click na karein.", "Apna OTP ya PIN kisi ko mat dein.", "Apne bank ki official helpline par rabta karein."],
                },
                "indicators": ["Artificial urgency triggers", "Financial institution impersonation lure"],
                "is_fallback": True,
                "provider": "fallback",
                "fallback_reason": reason,
            }

        return {
            "risk_score": 15.0,
            "verdict": "safe",
            "risk_level": "low",
            "summary": {
                "en": "No significant scam or phishing indicators detected in the message.",
                "ur": "Is paighaam mein kisi fraud ya phishing ka wazeh khatra nazar nahi aaya.",
            },
            "recommendations": {
                "en": ["Regular caution advised when interacting with unknown senders."],
                "ur": ["Naye ya ghair-muta'lliqa senders ke sath ahtiyaat baratna munasib hai."],
            },
            "indicators": ["Normal communication patterns"],
            "is_fallback": True,
            "provider": "fallback",
            "fallback_reason": reason,
        }


gemini_client = GeminiClient()
