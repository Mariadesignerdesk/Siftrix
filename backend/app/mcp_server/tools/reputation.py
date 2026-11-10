"""VirusTotal reputation lookup tool for Siftrix MCP server."""
from typing import Dict, Any

from app.services.virustotal import virustotal_client


async def check_url_reputation_tool(url: str) -> Dict[str, Any]:
    """Query historical domain and URL threat intelligence via VirusTotal.

    Does not contact or fetch the destination URL directly.
    Reuses existing VirusTotalClient and preserves status indicators.
    """
    report = await virustotal_client.get_url_report(url)
    return {
        "url": url,
        **report,
    }
