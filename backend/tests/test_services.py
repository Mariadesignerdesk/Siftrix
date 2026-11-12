import pytest
from unittest.mock import AsyncMock, patch
import httpx

from app.core.config import settings
from app.services.virustotal import VirusTotalClient, virustotal_client
from app.services.gemini import GeminiClient, gemini_client


# =====================================================================
# VirusTotal Client Tests
# =====================================================================

def test_virustotal_encode_url_identifier():
    """Verify URL is base64url encoded without padding characters (=)."""
    url = "https://example.com"
    encoded = VirusTotalClient.encode_url_identifier(url)
    assert "=" not in encoded
    assert encoded == "aHR0cHM6Ly9leGFtcGxlLmNvbQ"

    # Leading/trailing whitespace should be trimmed before encoding
    url_with_whitespace = "  https://example.com  "
    encoded_trimmed = VirusTotalClient.encode_url_identifier(url_with_whitespace)
    assert encoded_trimmed == "aHR0cHM6Ly9leGFtcGxlLmNvbQ"


@pytest.mark.asyncio
async def test_virustotal_ssrf_pre_validation_blocks_internal_targets():
    """Verify Phase 2 SSRF validator blocks private/loopback URLs before calling VT."""
    client = VirusTotalClient(api_key="mock_vt_key")

    blocked_targets = [
        "http://localhost:8000/api",
        "http://127.0.0.1:5000",
        "http://192.168.1.1",
        "http://169.254.169.254/latest/meta-data",
        "http://service.internal",
    ]

    for target in blocked_targets:
        res = await client.get_url_report(target)
        assert res["status"] == "blocked"
        assert res["is_fallback"] is True
        assert res["provider"] == "virustotal"
        assert res["malicious"] is None
        assert "blocked by security policy" in res["message"].lower()


@pytest.mark.asyncio
async def test_virustotal_missing_api_key_returns_unavailable():
    """Verify unconfigured client returns unavailable without generating fake counts."""
    client = VirusTotalClient(api_key="")
    assert client.is_configured is False

    res = await client.get_url_report("https://example.com")
    assert res["status"] == "unavailable"
    assert res["is_fallback"] is True
    assert res["provider"] == "virustotal"
    assert res["malicious"] is None
    assert res["suspicious"] is None
    assert res["harmless"] is None


@pytest.mark.asyncio
async def test_virustotal_existing_report_parsing():
    """Verify successful parsing of completed VirusTotal report."""
    client = VirusTotalClient(api_key="valid_vt_key")
    mock_payload = {
        "data": {
            "attributes": {
                "last_analysis_stats": {
                    "malicious": 8,
                    "suspicious": 3,
                    "harmless": 60,
                    "undetected": 5,
                },
                "reputation": -35,
            }
        }
    }

    mock_resp = httpx.Response(
    status_code=200,
    json=mock_payload,
    request=httpx.Request("GET", "https://www.virustotal.com/api/v3/urls/mock")
)
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        report = await client.get_url_report("https://known-malicious.test")

        assert report["status"] == "completed"
        assert report["is_fallback"] is False
        assert report["provider"] == "virustotal"
        assert report["malicious"] == 8
        assert report["suspicious"] == 3
        assert report["harmless"] == 60
        assert report["reputation"] == -35


@pytest.mark.asyncio
async def test_virustotal_new_url_submission_pending_status():
    """Verify 404 triggers submission and returns pending (never false zero clean result)."""
    client = VirusTotalClient(api_key="valid_vt_key")

    mock_404_resp = httpx.Response(
    status_code=404,
    request=httpx.Request("GET", "https://www.virustotal.com/api/v3/urls/mock")
)
    mock_post_resp = httpx.Response(
    status_code=200,
    json={"data": {"id": "u-mocked-analysis-id-12345", "type": "analysis"}},
    request=httpx.Request("POST", "https://www.virustotal.com/api/v3/urls")
)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get, \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_get.return_value = mock_404_resp
        mock_post.return_value = mock_post_resp

        result = await client.get_url_report("https://brand-new-domain.test")

        assert result["status"] == "pending"
        assert result["is_fallback"] is False
        assert result["provider"] == "virustotal"
        assert result["analysis_id"] == "u-mocked-analysis-id-12345"
        # Crucial requirement: malicious count must NOT be 0 (must be None / pending)
        assert result["malicious"] is None
        assert result["suspicious"] is None


@pytest.mark.asyncio
async def test_virustotal_rate_limit_handling():
    """Verify HTTP 429 returns rate_limited status without crashing."""
    client = VirusTotalClient(api_key="valid_vt_key")
    mock_429 = httpx.Response(status_code=429, json={"error": {"message": "Quota exceeded"}})

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_429
        result = await client.get_url_report("https://example.com/page")

        assert result["status"] == "rate_limited"
        assert result["is_fallback"] is True
        assert result["rate_limited"] is True
        assert result["malicious"] is None


@pytest.mark.asyncio
async def test_virustotal_timeout_and_error_handling():
    """Verify timeout and network failure return unavailable status without fake counts."""
    client = VirusTotalClient(api_key="valid_vt_key")

    with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Connection timed out")):
        result = await client.get_url_report("https://example.com/slow")

        assert result["status"] == "unavailable"
        assert result["is_fallback"] is True
        assert result["malicious"] is None
        assert "timed out" in result["message"].lower()


# =====================================================================
# Gemini Client Tests
# =====================================================================

def test_gemini_client_uses_configurable_model_and_header():
    """Verify Gemini client respects model setting and x-goog-api-key header."""
    client = GeminiClient(api_key="test_gemini_key", model="gemini-3.8-flash")
    assert client.model == "gemini-3.8-flash"
    assert client.headers["x-goog-api-key"] == "test_gemini_key"
    assert client.headers["Content-Type"] == "application/json"


@pytest.mark.asyncio
async def test_gemini_request_url_and_model_integration():
    """Verify endpoint URL uses the configured model name."""
    client = GeminiClient(api_key="my_secret_key", model="gemini-3.8-flash")

    mock_resp_json = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": '{"risk_score": 80.0, "verdict": "malicious", "summary": {"en": "Fraud", "ur": "Dhoka"}}'
                        }
                    ]
                }
            }
        ]
    }
    mock_resp = httpx.Response(status_code=200, json=mock_resp_json)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        await client.analyze_threat("Test prompt")

        assert mock_post.called
        called_url = mock_post.call_args[0][0]
        called_headers = mock_post.call_args[1]["headers"]

        # Endpoint must contain configured model
        assert "gemini-3.8-flash:generateContent" in called_url
        # API key must be in x-goog-api-key header, not in query string URL
        assert "key=" not in called_url
        assert called_headers["x-goog-api-key"] == "my_secret_key"


@pytest.mark.asyncio
async def test_gemini_structured_json_response_parsing():
    """Verify parsing valid Gemini response and tagging with provider metadata."""
    client = GeminiClient(api_key="valid_key", model="gemini-3.8-flash")

    mock_resp_json = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": (
                                '{"overall_risk_score": 85.0, "verdict": "malicious", "risk_level": "high", '
                                '"summary": {"en": "Fake bank alert", "ur": "Farzi bank notice"}, '
                                '"recommendations": {"en": ["Do not click"], "ur": ["Click na karein"]}}'
                            )
                        }
                    ]
                }
            }
        ]
    }
    mock_resp = httpx.Response(
    status_code=200,
    json=mock_resp_json,
    request=httpx.Request(
        "POST",
        "https://generativelanguage.googleapis.com/mock"
    )
)
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await client.analyze_threat("Urgent bank warning")

        assert result["is_fallback"] is False
        assert result["provider"] == "gemini"
        assert result["model"] == "gemini-3.8-flash"
        assert result["verdict"] == "malicious"
        assert result["summary"]["en"] == "Fake bank alert"
        assert result["summary"]["ur"] == "Farzi bank notice"


@pytest.mark.asyncio
async def test_gemini_missing_api_key_handling():
    """Verify unconfigured client defaults to heuristic fallback."""
    client = GeminiClient(api_key="")
    assert client.is_configured is False

    result = await client.analyze_threat("Random text")
    assert result["is_fallback"] is True
    assert result["provider"] == "fallback"
    assert result["fallback_reason"] == "unconfigured"


@pytest.mark.asyncio
async def test_gemini_fallback_identification_and_content():
    """Verify fallback response is clearly marked and provides bilingual content."""
    client = GeminiClient(api_key="")

    # Urgent financial lure
    res_urgent = await client.analyze_threat("Urgent: Bank account suspended immediately. Provide OTP.")
    assert res_urgent["is_fallback"] is True
    assert res_urgent["provider"] == "fallback"
    assert res_urgent["verdict"] == "malicious"
    assert "en" in res_urgent["summary"]
    assert "ur" in res_urgent["summary"]

    # Benign message
    res_benign = await client.analyze_threat("Hi Alice, are we having the project review today?")
    assert res_benign["is_fallback"] is True
    assert res_benign["provider"] == "fallback"
    assert res_benign["verdict"] == "safe"
    assert "en" in res_benign["summary"]
    assert "ur" in res_benign["summary"]


@pytest.mark.asyncio
async def test_gemini_timeout_and_error_handling():
    """Verify timeout, HTTP error, empty response and invalid JSON trigger fallback gracefully."""
    client = GeminiClient(api_key="valid_key")

    # 1. Timeout
    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Timeout")):
        res_timeout = await client.analyze_threat("prompt")
        assert res_timeout["is_fallback"] is True
        assert res_timeout["fallback_reason"] == "timeout"

    # 2. HTTP 429 Rate Limit
    mock_429 = httpx.Response(status_code=429, json={"error": {"message": "Rate limit exceeded"}})
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_429
        res_429 = await client.analyze_threat("prompt")
        assert res_429["is_fallback"] is True
        assert res_429["fallback_reason"] == "rate_limited"

    # 3. Invalid JSON text from model
    mock_bad_json = httpx.Response(
    status_code=200,
    json={"candidates": [{"content": {"parts": [{"text": "THIS IS NOT VALID JSON"}]}}]},
    request=httpx.Request(
        "POST",
        "https://generativelanguage.googleapis.com/mock"
    )
)
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_bad_json
        res_invalid = await client.analyze_threat("prompt")
        assert res_invalid["is_fallback"] is True
        assert res_invalid["fallback_reason"] == "invalid_json"

    # 4. Empty candidates
    mock_empty = httpx.Response(
        status_code=200,
        json={"candidates": []},
        request=httpx.Request(
            "POST",
            "https://generativelanguage.googleapis.com/mock"
        )
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_empty
        res_empty = await client.analyze_threat("prompt")
        assert res_empty["is_fallback"] is True
        assert res_empty["fallback_reason"] == "empty_response"


# =====================================================================
# Gemini Retry & Transient Error Tests
# =====================================================================

@pytest.mark.asyncio
async def test_gemini_retry_success_on_503():
    """Verify HTTP 503 triggers exactly one retry and returns success if retry passes."""
    client = GeminiClient(api_key="valid_key", retry_delay=0.001)

    mock_503 = httpx.Response(
        status_code=503,
        json={"error": {"message": "Service Unavailable"}},
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com/mock"),
    )
    mock_200 = httpx.Response(
        status_code=200,
        json={"candidates": [{"content": {"parts": [{"text": '{"sentiment": "urgent", "summary": "Alert"}'}]}}]},
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com/mock"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [mock_503, mock_200]
        res = await client.analyze_threat("Test prompt")

        assert mock_post.call_count == 2
        assert res["is_fallback"] is False
        assert res["provider"] == "gemini"
        assert res["sentiment"] == "urgent"


@pytest.mark.asyncio
async def test_gemini_retry_success_on_timeout():
    """Verify network timeout triggers exactly one retry and recovers on success."""
    client = GeminiClient(api_key="valid_key", retry_delay=0.001)

    mock_200 = httpx.Response(
        status_code=200,
        json={"candidates": [{"content": {"parts": [{"text": '{"sentiment": "safe", "summary": "All good"}'}]}}]},
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com/mock"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [httpx.TimeoutException("Read timed out"), mock_200]
        res = await client.analyze_threat("Test prompt")

        assert mock_post.call_count == 2
        assert res["is_fallback"] is False
        assert res["provider"] == "gemini"
        assert res["sentiment"] == "safe"


@pytest.mark.asyncio
async def test_gemini_retry_success_on_504():
    """Verify HTTP 504 Gateway Timeout triggers exactly one retry and succeeds."""
    client = GeminiClient(api_key="valid_key", retry_delay=0.001)

    mock_504 = httpx.Response(
        status_code=504,
        json={"error": {"message": "Gateway Timeout"}},
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com/mock"),
    )
    mock_200 = httpx.Response(
        status_code=200,
        json={"candidates": [{"content": {"parts": [{"text": '{"sentiment": "alarmist"}'}]}}]},
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com/mock"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [mock_504, mock_200]
        res = await client.analyze_threat("Test prompt")

        assert mock_post.call_count == 2
        assert res["is_fallback"] is False
        assert res["provider"] == "gemini"


@pytest.mark.asyncio
async def test_gemini_retry_failure_preserves_fallback():
    """Verify repeated transient errors exhaust maximum one retry and preserve heuristic fallback."""
    client = GeminiClient(api_key="valid_key", retry_delay=0.001)

    # 1. Consecutive 503s
    mock_503 = httpx.Response(
        status_code=503,
        json={"error": {"message": "Service Unavailable"}},
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com/mock"),
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [mock_503, mock_503]
        res = await client.analyze_threat("Urgent: Bank account suspended immediately. Provide OTP.")

        assert mock_post.call_count == 2
        assert res["is_fallback"] is True
        assert res["provider"] == "fallback"
        assert res["fallback_reason"] == "http_503"
        assert res["verdict"] == "malicious"

    # 2. Consecutive Timeouts
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [httpx.TimeoutException("Timeout 1"), httpx.TimeoutException("Timeout 2")]
        res_timeout = await client.analyze_threat("Normal message")

        assert mock_post.call_count == 2
        assert res_timeout["is_fallback"] is True
        assert res_timeout["provider"] == "fallback"
        assert res_timeout["fallback_reason"] == "timeout"
        assert res_timeout["verdict"] == "safe"


@pytest.mark.asyncio
async def test_gemini_non_retryable_errors_no_retry():
    """Verify HTTP 429, 400, and 401 fail fast with zero retries."""
    client = GeminiClient(api_key="valid_key", retry_delay=0.001)

    for status_code, expected_reason in [(429, "rate_limited"), (400, "http_400"), (401, "http_401")]:
        mock_err = httpx.Response(
            status_code=status_code,
            json={"error": {"message": f"Error {status_code}"}},
            request=httpx.Request("POST", "https://generativelanguage.googleapis.com/mock"),
        )
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_err
            res = await client.analyze_threat("Test prompt")

            assert mock_post.call_count == 1  # Exactly 1 call, NEVER retried
            assert res["is_fallback"] is True
            assert res["fallback_reason"] == expected_reason
