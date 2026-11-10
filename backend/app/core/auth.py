"""Guest session token and ownership resolution dependencies for Siftrix."""
import logging
import uuid
from typing import Optional
from fastapi import Header, HTTPException, status

logger = logging.getLogger(__name__)


def validate_uuid4(token_str: str) -> uuid.UUID:
    """Validate that token_str is a canonical UUIDv4.

    Raises ValueError if string is not a valid UUID or not version 4.
    """
    if not token_str or not isinstance(token_str, str):
        raise ValueError("Token must be a non-empty string")
    cleaned = token_str.strip()
    parsed = uuid.UUID(cleaned)
    if parsed.version != 4:
        raise ValueError(f"UUID is version {parsed.version}, expected version 4")
    return parsed


def resolve_owner_id_for_scan(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
) -> uuid.UUID:
    """Resolve owner UUID for scan submissions.

    - If X-Session-ID is provided: strictly validates UUIDv4 format. Rejects invalid/non-v4 with HTTP 400.
    - If X-Session-ID is omitted: generates a new cryptographically secure UUIDv4.
    """
    if x_session_id is not None:
        try:
            return validate_uuid4(x_session_id)
        except (ValueError, AttributeError):
            logger.warning("Rejected scan request with malformed or non-v4 X-Session-ID header")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Session-ID header: must be a valid canonical UUIDv4",
            )
    return uuid.uuid4()


def require_owner_id_for_history(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
) -> uuid.UUID:
    """Require and enforce owner UUID for history retrieval and deletion operations.

    - If X-Session-ID is omitted: raises HTTP 401 Unauthorized.
    - If X-Session-ID is malformed or non-v4: raises HTTP 400 Bad Request.
    - If valid: returns validated UUIDv4.
    """
    if not x_session_id or not x_session_id.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication or X-Session-ID header required to access scan history",
        )
    try:
        return validate_uuid4(x_session_id)
    except (ValueError, AttributeError):
        logger.warning("Rejected history request with malformed or non-v4 X-Session-ID header")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Session-ID header: must be a valid canonical UUIDv4",
        )
