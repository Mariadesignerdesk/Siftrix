"""Cryptographic security utilities for Siftrix: password hashing and JWT management.

- Password Hashing: uses Python standard library hashlib.scrypt with cryptographically
  secure random salts (secrets.token_bytes) and constant-time equality checks (hmac.compare_digest).
- JWT Authentication: uses PyJWT with HMAC-SHA256 (HS256) signatures.
"""
import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union

import jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

# Standard scrypt parameters (OWASP / RFC 7914 recommended minimums)
SCRYPT_N = 16384  # CPU/memory cost parameter (2^14)
SCRYPT_R = 8      # Block size parameter
SCRYPT_P = 1      # Parallelization parameter
SCRYPT_DKLEN = 64 # Length of the derived key in bytes
SALT_BYTES = 16   # 128-bit cryptographically secure random salt


def hash_password(password: str) -> str:
    """Hash a plaintext password using hashlib.scrypt with a unique random salt.

    Returns:
        Formatted string: 'scrypt$<n>$<r>$<p>$<salt_hex>$<derived_hex>'
    """
    if not password or not isinstance(password, str):
        raise ValueError("Password must be a non-empty string")

    salt = secrets.token_bytes(SALT_BYTES)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${derived.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored scrypt password hash.

    Enforces exact scrypt parameters (N=16384, r=8, p=1, salt=16B, dklen=64B)
    and uses constant-time comparison (hmac.compare_digest) to prevent timing attacks.
    Returns False on any format error, parameter mismatch, or verification failure.
    """
    if not plain_password or not isinstance(plain_password, str):
        return False
    if not hashed_password or not isinstance(hashed_password, str):
        return False

    try:
        parts = hashed_password.split("$")
        if len(parts) != 6 or parts[0] != "scrypt":
            return False

        # Strictly enforce identical parameters to hash_password(): N=16384, r=8, p=1
        if parts[1] != str(SCRYPT_N) or parts[2] != str(SCRYPT_R) or parts[3] != str(SCRYPT_P):
            return False

        salt = bytes.fromhex(parts[4])
        expected_derived = bytes.fromhex(parts[5])

        # Strictly require exact salt length (16 bytes) and derived key length (64 bytes)
        if len(salt) != SALT_BYTES or len(expected_derived) != SCRYPT_DKLEN:
            return False

        actual_derived = hashlib.scrypt(
            plain_password.encode("utf-8"),
            salt=salt,
            n=SCRYPT_N,
            r=SCRYPT_R,
            p=SCRYPT_P,
            dklen=SCRYPT_DKLEN,
        )
        return hmac.compare_digest(actual_derived, expected_derived)
    except Exception as e:
        logger.debug(f"Password verification encountered an error: {e}")
        return False


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate a signed JWT access token for an authenticated subject.

    Args:
        subject: The unique user identifier (UUID or string).
        expires_delta: Optional custom token lifetime. Defaults to settings.ACCESS_TOKEN_EXPIRE_MINUTES.
        extra_claims: Optional additional payload claims (e.g., email, role).

    Returns:
        Encoded and signed JWT string.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        reserved_claims = {"sub", "iat", "exp"}
        conflicting_claims = reserved_claims.intersection(extra_claims)

        if conflicting_claims:
            raise ValueError(
                f"Additional claims cannot override reserved JWT claims: "
                f"{', '.join(sorted(conflicting_claims))}"
            )

        payload.update(extra_claims)

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a signed JWT access token.

    Args:
        token: Encoded JWT string.

    Returns:
        Dict of claims contained in the token payload.

    Raises:
        jwt.ExpiredSignatureError: If the token has expired.
        jwt.InvalidTokenError: If the signature is invalid or token is malformed.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
