"""Authentication, guest session tokens, and ownership resolution dependencies for Siftrix."""
import logging
import uuid
from typing import Optional
from fastapi import Header, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.scan import ScanRecord

logger = logging.getLogger(__name__)

# Bearer scheme with auto_error=False to allow seamless fallback to guest X-Session-ID
bearer_scheme = HTTPBearer(auto_error=False)


def validate_uuid4(token_str: str) -> uuid.UUID:
    """Validate that token_str is a canonical UUIDv4.

    Raises ValueError if string is not a valid UUID or not version 4.
    """
    if not token_str or not isinstance(token_str, str):
        raise ValueError("Token must be a non-empty string")
    cleaned = token_str.strip()
    parsed = uuid.UUID(cleaned)
    if str(parsed) != token_str:
        raise ValueError("UUID must use canonical lowercase hyphenated format")
    if parsed.version != 4:
        raise ValueError(f"UUID is version {parsed.version}, expected version 4")
    return parsed


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Enforce authentication via a valid JWT Bearer token and return the active User.

    Raises:
        HTTP 401 Unauthorized: If token is missing, expired, malformed, or user not found.
        HTTP 403 Forbidden: If the user account is inactive.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims: subject missing",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = uuid.UUID(str(user_id_str))
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Resolve authenticated user if a Bearer token is provided; returns None for guests.

    If a token is presented, it MUST be valid. Invalid or expired tokens raise HTTP 401
    rather than quietly downgrading to guest access.
    """
    if not credentials or not credentials.credentials:
        return None
    return get_current_user(credentials=credentials, db=db)


def _is_registered_user_id(db: Session, candidate_id: uuid.UUID) -> bool:
    """Check whether the given UUID belongs to a registered User account."""
    return db.query(User).filter(User.id == candidate_id).first() is not None


def resolve_owner_id_for_scan(
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
) -> uuid.UUID:
    """Resolve owner UUID for scan submissions.

    - Priority 1: Authenticated user via Bearer token (returns user.id).
    - Priority 2: Guest with X-Session-ID (validates canonical UUIDv4, HTTP 400 if invalid).
      If the UUID belongs to a registered user, generates a fresh UUIDv4 instead.
    - Priority 3: Anonymous without header (generates new cryptographically secure UUIDv4).
    """
    if current_user is not None:
        return current_user.id

    if x_session_id is not None:
        try:
            guest_id = validate_uuid4(x_session_id)
        except (ValueError, AttributeError):
            logger.warning("Rejected scan request with malformed or non-v4 X-Session-ID header")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Session-ID header: must be a valid canonical UUIDv4",
            )
        if _is_registered_user_id(db, guest_id):
            logger.warning(
                "Guest scan attempted to use registered user UUID as X-Session-ID; generating fresh UUID"
            )
            return uuid.uuid4()
        return guest_id
    return uuid.uuid4()


def require_owner_id_for_history(
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
) -> uuid.UUID:
    """Require and enforce owner UUID for history retrieval and deletion operations.

    - Priority 1: Authenticated user via Bearer token (returns user.id).
    - Priority 2: Guest with X-Session-ID (validates canonical UUIDv4, HTTP 400 if invalid).
      Rejects with HTTP 401 if the UUID belongs to a registered user account.
    - Raises HTTP 401 Unauthorized if neither authentication nor X-Session-ID is present.
    """
    if current_user is not None:
        return current_user.id

    if not x_session_id or not x_session_id.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication or X-Session-ID header required to access scan history",
        )
    try:
        guest_id = validate_uuid4(x_session_id)
    except (ValueError, AttributeError):
        logger.warning("Rejected history request with malformed or non-v4 X-Session-ID header")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Session-ID header: must be a valid canonical UUIDv4",
        )

    if _is_registered_user_id(db, guest_id):
        logger.warning("Rejected unauthenticated history request using registered user UUID")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access registered user scan history",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return guest_id


def migrate_guest_scans(
    db: Session,
    guest_session_id: uuid.UUID,
    user_id: uuid.UUID,
) -> int:
    """Associate existing guest scans with a registered user account within the current transaction.

    Never migrates scans from a session ID that belongs to a registered user.
    Returns the number of migrated scan records.
    """
    if guest_session_id == user_id:
        return 0

    if _is_registered_user_id(db, guest_session_id):
        logger.warning(
            "Refused to migrate scans from registered user UUID %s to user %s",
            guest_session_id,
            user_id,
        )
        return 0

    count = (
        db.query(ScanRecord)
        .filter(ScanRecord.user_id == guest_session_id)
        .update({ScanRecord.user_id: user_id}, synchronize_session=False)
    )
    return count
