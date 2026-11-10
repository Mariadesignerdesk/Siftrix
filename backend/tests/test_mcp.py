"""Tests for Siftrix Model Context Protocol (MCP) server, tools, and client."""
import json
import pytest
from unittest.mock import AsyncMock, patch

from app.mcp_server.server import mcp
from app.mcp_server.tools.validation import validate_url_tool
from app.mcp_server.tools.reputation import check_url_reputation_tool
from app.mcp_server.client import SiftrixMCPClient


# =====================================================================
# 1. validate_url Tool Unit Tests
# =====================================================================

@pytest.mark.asyncio
async def test_validate_url_tool_allowed_public_urls():
    """Verify standard public URLs pass validation and return clear non-phishing-free warning."""
    urls = [
        "https://example.com",
        "https://www.google.com/search?q=test",
        "http://subdomain.trusted-site.org/index.html",
    ]
    for url in urls:
        res = await validate_url_tool(url)
        assert res["url"] == url
        assert res["is_valid"] is True
        assert res["is_safe_target"] is True
        assert res["error"] is None
        assert "does not confirm the website is safe or phishing-free" in res["message"]


@pytest.mark.asyncio
async def test_validate_url_tool_ssrf_blocked_targets():
    """Verify localhost, private IPs, and cloud metadata are rejected with is_safe_target=False."""
    blocked_urls = [
        "http://localhost:8000/api",
        "http://127.0.0.1:3000",
        "http://192.168.1.1/admin",
        "http://10.0.0.1",
        "http://172.16.0.1",
        "http://169.254.169.254/latest/meta-data",
        "http://service.local",
        "http://intranet/dashboard",
    ]
    for url in blocked_urls:
        res = await validate_url_tool(url)
        assert res["url"] == url
        assert res["is_valid"] is False
        assert res["is_safe_target"] is False
        assert res["error"] is not None
        assert "failed" in res["message"].lower()


@pytest.mark.asyncio
async def test_validate_url_tool_invalid_schemes_and_malformed():
    """Verify non-http/https schemes and malformed URLs are rejected."""
    invalid_urls = [
        "ftp://example.com/file",
        "file:///etc/passwd",
        "gopher://example.com",
        "not_a_url",
        "",
        "https://user:pass@example.com",
    ]
    for url in invalid_urls:
        res = await validate_url_tool(url)
        assert res["is_valid"] is False
        assert res["is_safe_target"] is False
        assert res["error"] is not None


# =====================================================================
# 2. check_url_reputation Tool Unit Tests (Mocked VirusTotal)
# =====================================================================

@pytest.mark.asyncio
async def test_check_url_reputation_tool_completed_report():
    """Verify tool formats completed VirusTotal analysis report faithfully."""
    mock_report = {
        "status": "completed",
        "is_fallback": False,
        "provider": "virustotal",
        "malicious": 8,
        "suspicious": 2,
        "harmless": 65,
        "undetected": 5,
        "reputation": -30,
        "rate_limited": False,
    }

    with patch("app.mcp_server.tools.reputation.virustotal_client.get_url_report", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_report
        res = await check_url_reputation_tool("https://phishing-site.test")

        assert res["url"] == "https://phishing-site.test"
        assert res["status"] == "completed"
        assert res["malicious"] == 8
        assert res["suspicious"] == 2
        assert res["harmless"] == 65
        assert res["is_fallback"] is False


@pytest.mark.asyncio
async def test_check_url_reputation_tool_pending_submission():
    """Verify pending scans return status=pending and never a false zero clean result."""
    mock_report = {
        "status": "pending",
        "is_fallback": False,
        "provider": "virustotal",
        "message": "URL submitted for scanning; analysis is pending on VirusTotal.",
        "analysis_id": "u-analysis-12345",
        "malicious": None,
        "suspicious": None,
        "harmless": None,
        "undetected": None,
        "reputation": None,
    }

    with patch("app.mcp_server.tools.reputation.virustotal_client.get_url_report", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_report
        res = await check_url_reputation_tool("https://new-unseen-domain.test")

        assert res["status"] == "pending"
        assert res["malicious"] is None
        assert res["suspicious"] is None
        assert res["is_fallback"] is False


@pytest.mark.asyncio
async def test_check_url_reputation_tool_rate_limited():
    """Verify HTTP 429 rate-limited status is handled and preserved."""
    mock_report = {
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

    with patch("app.mcp_server.tools.reputation.virustotal_client.get_url_report", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_report
        res = await check_url_reputation_tool("https://example.com/item")

        assert res["status"] == "rate_limited"
        assert res["rate_limited"] is True
        assert res["is_fallback"] is True
        assert res["malicious"] is None


@pytest.mark.asyncio
async def test_check_url_reputation_tool_ssrf_blocked():
    """Verify SSRF-blocked URLs return status=blocked without contacting external APIs."""
    mock_report = {
        "status": "blocked",
        "is_fallback": True,
        "provider": "virustotal",
        "message": "URL blocked by security policy: Targeting localhost is forbidden",
        "malicious": None,
        "suspicious": None,
        "harmless": None,
        "undetected": None,
        "reputation": None,
    }

    with patch("app.mcp_server.tools.reputation.virustotal_client.get_url_report", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_report
        res = await check_url_reputation_tool("http://localhost:8000")

        assert res["status"] == "blocked"
        assert res["malicious"] is None
        assert "blocked by security policy" in res["message"]


# =====================================================================
# 3. FastMCP Server In-Memory Registration Tests
# =====================================================================

@pytest.mark.asyncio
async def test_fastmcp_server_registers_exact_two_tools():
    """Verify the FastMCP server registers exactly validate_url and check_url_reputation."""
    tools = await mcp.list_tools()
    tool_names = [t.name for t in tools]

    assert len(tools) == 2
    assert "validate_url" in tool_names
    assert "check_url_reputation" in tool_names

    # Check validate_url tool schema
    val_tool = next(t for t in tools if t.name == "validate_url")
    assert "url" in val_tool.inputSchema["properties"]
    assert "url" in val_tool.inputSchema["required"]

    # Check check_url_reputation tool schema
    rep_tool = next(t for t in tools if t.name == "check_url_reputation")
    assert "url" in rep_tool.inputSchema["properties"]
    assert "url" in rep_tool.inputSchema["required"]


@pytest.mark.asyncio
async def test_fastmcp_in_memory_call_tool():
    """Verify executing tool via FastMCP server in-memory interface."""
    contents = await mcp.call_tool("validate_url", {"url": "https://example.com/verify"})
    assert len(contents) > 0
    data = json.loads(contents[0].text)

    assert data["is_valid"] is True
    assert data["is_safe_target"] is True
    assert data["url"] == "https://example.com/verify"


# =====================================================================
# 4. SiftrixMCPClient Stdio Integration Tests
# =====================================================================

@pytest.mark.asyncio
async def test_mcp_client_stdio_lifecycle_and_tools():
    """Verify SiftrixMCPClient launches subprocess over stdio, lists tools, and executes calls."""
    async with SiftrixMCPClient() as client:
        # 1. Verify list_tools
        tools = await client.list_tools()
        names = [t.name for t in tools]
        assert "validate_url" in names
        assert "check_url_reputation" in names

        # 2. Call validate_url with valid URL
        res_valid = await client.call_tool("validate_url", {"url": "https://example.com/portal"})
        assert res_valid.get("is_valid") is True
        assert res_valid.get("is_safe_target") is True
        assert res_valid.get("hostname") == "example.com"

        # 3. Call validate_url with SSRF target
        res_blocked = await client.call_tool("validate_url", {"url": "http://127.0.0.1:8000"})
        assert res_blocked.get("is_valid") is False
        assert res_blocked.get("is_safe_target") is False
        assert "forbidden" in res_blocked.get("error", "").lower()
