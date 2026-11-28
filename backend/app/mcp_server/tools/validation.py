"""URL validation and SSRF boundary check tool for Siftrix MCP server."""
from typing import Dict, Any
from urllib.parse import urlparse

from app.schemas.scan import validate_url_for_ssrf


async def validate_url_tool(url: str) -> Dict[str, Any]:
    """Validate URL syntax and enforce SSRF boundaries.

    IMPORTANT:
    is_safe_target=True only indicates the URL passed static syntax and SSRF checks
    (e.g., it is not targeting localhost, private IP ranges, or cloud metadata).
    It DOES NOT guarantee the destination is trustworthy, safe, or free from phishing/malware.
    """
    try:
        validated_url = validate_url_for_ssrf(url)
        parsed = urlparse(validated_url)
        return {
            "url": validated_url,
            "is_valid": True,
            "is_safe_target": True,
            "scheme": parsed.scheme.lower() if parsed.scheme else None,
            "hostname": parsed.hostname,
            "error": None,
            "message": (
                "URL passed static SSRF and syntax checks. "
                "This does not confirm the website is safe or phishing-free."
            ),
        }
    except ValueError as e:
        return {
            "url": url,
            "is_valid": False,
            "is_safe_target": False,
            "scheme": None,
            "hostname": None,
            "error": str(e),
            "message": f"URL validation failed: {e}",
        }
