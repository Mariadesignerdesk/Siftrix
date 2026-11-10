"""Siftrix FastMCP server exposing URL validation and reputation tools."""
import sys
from mcp.server.fastmcp import FastMCP

from app.mcp_server.tools.validation import validate_url_tool
from app.mcp_server.tools.reputation import check_url_reputation_tool

# Initialize FastMCP server
mcp = FastMCP("siftrix-mcp")


@mcp.tool(
    name="validate_url",
    description=(
        "Syntactically validate a URL and enforce SSRF boundaries, blocking private IP ranges, "
        "loopback, cloud metadata, and internal hostnames. Note: is_safe_target=True only confirms "
        "the URL passed static SSRF checks; it does not confirm the website is safe or phishing-free."
    ),
)
async def validate_url(url: str) -> dict:
    """Validate a URL against syntactic and SSRF rules without fetching the destination."""
    return await validate_url_tool(url)


@mcp.tool(
    name="check_url_reputation",
    description=(
        "Query VirusTotal threat intelligence for a URL to inspect engine detection statistics "
        "and reputation without visiting the target server directly."
    ),
)
async def check_url_reputation(url: str) -> dict:
    """Check domain and URL threat reputation via VirusTotal without visiting the URL."""
    return await check_url_reputation_tool(url)


def main():
    """Run FastMCP server over stdio transport."""
    # FastMCP uses stderr for internal logging by default; stdout is dedicated to JSON-RPC
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
