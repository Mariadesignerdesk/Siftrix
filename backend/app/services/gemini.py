import json
import logging
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiClient:
    """Async client for Google Gemini API with bilingual extraction & heuristic fallback."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.timeout = settings.GEMINI_TIMEOUT

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
            try:
                response = await client.post(endpoint, headers=self.headers, json=payload)

                if response.status_code == 429:
                    logger.warning("Gemini API rate limit reached (HTTP 429). Using heuristic fallback.")
                    return self._heuristic_fallback(prompt, reason="rate_limited")

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
                logger.error(f"Gemini API request timed out: {e}")
                return self._heuristic_fallback(prompt, reason="timeout")
            except httpx.HTTPStatusError as e:
                logger.error(f"Gemini API HTTP error: {e.response.status_code}")
                reason = "rate_limited" if e.response.status_code == 429 else f"http_{e.response.status_code}"
                return self._heuristic_fallback(prompt, reason=reason)
            except Exception as e:
                logger.error(f"Gemini API request failed: {e}")
                return self._heuristic_fallback(prompt, reason=f"error_{type(e).__name__}")

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
