"""User authentication and profile management endpoints for Siftrix."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.auth import get_current_user, validate_uuid4, migrate_guest_scans
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def register(
    payload: UserRegisterRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Register a new user account, hash their password using Scrypt, and migrate any guest scans.

    - Rejects duplicate emails with HTTP 409 Conflict.
    - Validates minimum 8-character password.
    - If a valid X-Session-ID is supplied, existing guest scans are migrated within this transaction.
    - If X-Session-ID is malformed/invalid, rejects with HTTP 400 Bad Request.
    """
    # 1. Reject duplicate email registrations
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists",
        )

    # 2. Validate optional guest session token upfront
    guest_uuid = None
    if x_session_id is not None:
        try:
            guest_uuid = validate_uuid4(x_session_id)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Session-ID header: must be a valid canonical UUIDv4",
            )

    # 3. Hash password using Scrypt with a unique cryptographically random salt
    hashed_pw = hash_password(payload.password)

    # 4. Create and persist user record within transaction
    user = User(
        email=payload.email,
        hashed_password=hashed_pw,
        full_name=payload.full_name,
        is_active=True,
    )
    db.add(user)
    db.flush()

    # 5. Atomically migrate prior guest scans to the newly created user ID
    if guest_uuid is not None:
        migrated_count = migrate_guest_scans(
            db=db,
            guest_session_id=guest_uuid,
            user_id=user.id,
        )
        if migrated_count > 0:
            logger.info(f"Migrated {migrated_count} guest scans to new user account {user.id}")

    db.commit()
    db.refresh(user)

    # 6. Issue signed JWT bearer access token
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email},
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Sign in with existing credentials",
)
def login(
    payload: UserLoginRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate with email and password, returning a JWT access token and migrating guest scans.

    - Returns HTTP 401 Unauthorized for invalid email or password.
    - Returns HTTP 403 Forbidden for deactivated accounts.
    - If a valid X-Session-ID is supplied, guest scans are migrated within this transaction.
    - If X-Session-ID is malformed/invalid, rejects with HTTP 400 Bad Request.
    """
    # 1. Validate optional guest session token upfront
    guest_uuid = None
    if x_session_id is not None:
        try:
            guest_uuid = validate_uuid4(x_session_id)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Session-ID header: must be a valid canonical UUIDv4",
            )

    # 2. Look up user by normalized email
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Enforce active account status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # 4. Migrate guest scans if session header was provided
    if guest_uuid is not None:
        migrated_count = migrate_guest_scans(
            db=db,
            guest_session_id=guest_uuid,
            user_id=user.id,
        )
        if migrated_count > 0:
            db.commit()
            db.refresh(user)
            logger.info(f"Migrated {migrated_count} guest scans to logged-in user {user.id}")

    # 5. Issue signed JWT bearer access token
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email},
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve current user profile",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the profile of the currently authenticated user.

    Requires a valid Bearer token in the Authorization header.
    Hashed passwords are never included in the response.
    """
    return UserResponse.model_validate(current_user)
