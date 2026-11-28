"""Asynchronous MCP Client for communicating with the Siftrix FastMCP server over stdio."""
import json
import os
import sys
from contextlib import AsyncExitStack
from pathlib import Path
from typing import Optional, Dict, Any, List

from mcp.client.session import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.types import CallToolResult, TextContent, Tool


class SiftrixMCPClient:
    """Async context manager client communicating with Siftrix FastMCP server over stdio."""

    def __init__(
        self,
        python_path: Optional[str] = None,
        server_module: str = "app.mcp_server.server",
        backend_dir: Optional[Path] = None,
    ):
        self.python_path = python_path or sys.executable
        self.server_module = server_module
        # Resolve backend directory if not provided
        self.backend_dir = backend_dir or Path(__file__).resolve().parents[2]

        self._exit_stack: Optional[AsyncExitStack] = None
        self._session: Optional[ClientSession] = None

    async def __aenter__(self) -> "SiftrixMCPClient":
        """Start the MCP server subprocess and initialize JSON-RPC session."""
        self._exit_stack = AsyncExitStack()

        # Build clean environment with UTF-8 encoding for Windows stdio reliability
        env = os.environ.copy()
        env["PYTHONPATH"] = str(self.backend_dir)
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"
        env["PYTHONUNBUFFERED"] = "1"

        server_params = StdioServerParameters(
            command=self.python_path,
            args=["-m", self.server_module],
            cwd=str(self.backend_dir),
            env=env,
        )

        try:
            read_stream, write_stream = await self._exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            self._session = await self._exit_stack.enter_async_context(
                ClientSession(read_stream, write_stream)
            )
            await self._session.initialize()
            return self
        except Exception:
            await self._exit_stack.aclose()
            self._session = None
            self._exit_stack = None
            raise

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Clean up ClientSession and terminate subprocess."""
        if self._exit_stack:
            await self._exit_stack.aclose()
        self._session = None
        self._exit_stack = None

    @property
    def session(self) -> ClientSession:
        """Return active ClientSession or raise RuntimeError."""
        if not self._session:
            raise RuntimeError("MCP client session is not active. Use 'async with SiftrixMCPClient():'")
        return self._session

    async def list_tools(self) -> List[Tool]:
        """List all tools registered on the MCP server."""
        result = await self.session.list_tools()
        return result.tools

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call an MCP tool and return parsed JSON payload from TextContent."""
        result: CallToolResult = await self.session.call_tool(tool_name, arguments)

        if result.isError:
            error_msg = "Unknown MCP tool error"
            if result.content:
                for item in result.content:
                    if isinstance(item, TextContent):
                        error_msg = item.text
                        break
            return {"error": error_msg, "is_error": True}

        # Extract and parse content
        if not result.content:
            return {}

        for item in result.content:
            if isinstance(item, TextContent):
                try:
                    return json.loads(item.text)
                except json.JSONDecodeError:
                    return {"text": item.text}

        return {"raw_content": [c.model_dump() for c in result.content]}
