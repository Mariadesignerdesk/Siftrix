"""Comprehensive unit tests for Siftrix Phase 1 authentication foundation:
- Password hashing (hashlib.scrypt), unique salts, verification, rejection.
- JWT creation, decoding, expiration, tampering detection.
- User SQLAlchemy model attributes and defaults.
- Pydantic authentication schema validation.
"""
import uuid
from datetime import timedelta
import pytest
import jwt
from pydantic import ValidationError

from app.core.config import Settings, settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    TokenPayload,
)


# =====================================================================
# 1. Password Hashing & Verification Tests (Scrypt)
# =====================================================================

def test_password_hash_and_verification_success():
    """Verify standard scrypt password hashing and correct verification."""
    password = "Secur3P@ssw0rd!2026"
    hashed = hash_password(password)

    assert isinstance(hashed, str)
    assert hashed.startswith("scrypt$")
    assert verify_password(password, hashed) is True


def test_incorrect_password_rejection():
    """Verify incorrect passwords are rejected with False."""
    password = "MyCorrectPassword123"
    hashed = hash_password(password)

    assert verify_password("WrongPassword123", hashed) is False
    assert verify_password("mycorrectpassword123", hashed) is False  # Case-sensitive
    assert verify_password("", hashed) is False


def test_malformed_hash_rejection():
    """Verify malformed, blank, or corrupted hash strings fail gracefully."""
    assert verify_password("Password123", "") is False
    assert verify_password("Password123", "plain_text_not_hash") is False
    assert verify_password("Password123", "scrypt$invalid$format") is False
    assert verify_password("Password123", "scrypt$16384$8$1$badhex$badhex") is False
    assert verify_password("Password123", "argon2$some$other$hash") is False


def test_empty_password_hashing_raises_value_error():
    """Verify hash_password rejects blank or non-string inputs."""
    with pytest.raises(ValueError):
        hash_password("")
    with pytest.raises(ValueError):
        hash_password(None)  # type: ignore


def test_unique_salts_for_identical_passwords():
    """Verify identical plaintext passwords produce distinct scrypt hashes."""
    password = "IdenticalPasswordToTestSalt123!"
    hash1 = hash_password(password)
    hash2 = hash_password(password)

    # Hashes must differ because salts are random
    assert hash1 != hash2

    # Both must verify successfully against the original password
    assert verify_password(password, hash1) is True
    assert verify_password(password, hash2) is True


def test_verify_password_rejects_incorrect_scrypt_parameters():
    """Verify verify_password rejects hashes with non-standard scrypt parameters (N, r, p)."""
    valid_salt = "0123456789abcdef0123456789abcdef"  # 16 bytes (32 hex)
    valid_dk = "a" * 128                              # 64 bytes (128 hex)

    # N != 16384
    assert verify_password("pwd", f"scrypt$32768$8$1${valid_salt}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$8192$8$1${valid_salt}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$1024$8$1${valid_salt}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$0$8$1${valid_salt}${valid_dk}") is False

    # r != 8
    assert verify_password("pwd", f"scrypt$16384$16$1${valid_salt}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$16384$4$1${valid_salt}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$16384$1$1${valid_salt}${valid_dk}") is False

    # p != 1
    assert verify_password("pwd", f"scrypt$16384$8$2${valid_salt}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$16384$8$0${valid_salt}${valid_dk}") is False

    # Non-numeric / malformed parameters
    assert verify_password("pwd", f"scrypt$invalid$8$1${valid_salt}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$16384$invalid$1${valid_salt}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$16384$8$invalid${valid_salt}${valid_dk}") is False


def test_verify_password_rejects_invalid_salt_length():
    """Verify verify_password rejects hashes where salt length is not exactly 16 bytes."""
    valid_dk = "a" * 128  # 64 bytes (128 hex)

    # Salt too short (8 bytes = 16 hex, 15 bytes = 30 hex, 0 bytes)
    assert verify_password("pwd", f"scrypt$16384$8$1${'0' * 16}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$16384$8$1${'0' * 30}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$16384$8$1$${valid_dk}") is False

    # Salt too long (32 bytes = 64 hex)
    assert verify_password("pwd", f"scrypt$16384$8$1${'0' * 64}${valid_dk}") is False

    # Odd-length or non-hex salt
    assert verify_password("pwd", f"scrypt$16384$8$1${'0' * 31}${valid_dk}") is False
    assert verify_password("pwd", f"scrypt$16384$8$1${'g' * 32}${valid_dk}") is False


def test_verify_password_rejects_invalid_derived_key_length():
    """Verify verify_password rejects hashes where derived key is not exactly 64 bytes."""
    valid_salt = "0123456789abcdef0123456789abcdef"  # 16 bytes (32 hex)

    # Derived key too short (32 bytes = 64 hex, 63 bytes = 126 hex, empty)
    assert verify_password("pwd", f"scrypt$16384$8$1${valid_salt}${'a' * 64}") is False
    assert verify_password("pwd", f"scrypt$16384$8$1${valid_salt}${'a' * 126}") is False
    assert verify_password("pwd", f"scrypt$16384$8$1${valid_salt}$") is False

    # Derived key too long (128 bytes = 256 hex)
    assert verify_password("pwd", f"scrypt$16384$8$1${valid_salt}${'a' * 256}") is False

    # Odd-length or non-hex derived key
    assert verify_password("pwd", f"scrypt$16384$8$1${valid_salt}${'a' * 127}") is False
    assert verify_password("pwd", f"scrypt$16384$8$1${valid_salt}${'z' * 128}") is False


def test_verify_password_accepts_valid_existing_hashes():
    """Verify verify_password correctly authenticates precomputed and newly generated valid hashes."""
    # Precomputed known-valid hash for password 'SiftrixSecure2026!'
    known_hash = (
        "scrypt$16384$8$1$"
        "0123456789abcdef0123456789abcdef$"
        "1f34c81256d23ee564c63a8a406c96d4909a5f86300ed06defc1550498e9f372"
        "f6067a2e10f89b68e22ce731fde7eaf35cc9c3075b9b11192ca4bff48d17f1f5"
    )

    assert verify_password("SiftrixSecure2026!", known_hash) is True
    assert verify_password("WrongPassword2026!", known_hash) is False

    # Newly generated hash via hash_password()
    password = "AnotherStrongAuthPassword99!"
    fresh_hash = hash_password(password)
    assert verify_password(password, fresh_hash) is True
    assert verify_password("DifferentPassword!", fresh_hash) is False


# =====================================================================
# 2. JWT Creation, Decoding & Expiration Tests
# =====================================================================

def test_jwt_creation_and_successful_decoding():
    """Verify JWT access token encodes claims and decodes cleanly."""
    subject_id = str(uuid.uuid4())
    extra = {"email": "analyst@siftrix.com", "role": "security_officer"}

    token = create_access_token(
        subject=subject_id,
        expires_delta=timedelta(minutes=30),
        extra_claims=extra,
    )

    assert isinstance(token, str)
    claims = decode_access_token(token)

    assert claims["sub"] == subject_id
    assert claims["email"] == "analyst@siftrix.com"
    assert claims["role"] == "security_officer"
    assert "exp" in claims
    assert "iat" in claims
    assert claims["exp"] > claims["iat"]


def test_jwt_default_expiration():
    """Verify JWT without explicit expires_delta uses settings.ACCESS_TOKEN_EXPIRE_MINUTES."""
    subject_id = str(uuid.uuid4())
    token = create_access_token(subject=subject_id)
    claims = decode_access_token(token)

    expected_duration = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    actual_duration = claims["exp"] - claims["iat"]
    # Allow 5-second variance for clock tick
    assert abs(actual_duration - expected_duration) <= 5


def test_jwt_expiration_raises_expired_signature_error():
    """Verify an expired token raises jwt.ExpiredSignatureError on decode."""
    subject_id = str(uuid.uuid4())
    expired_token = create_access_token(
        subject=subject_id,
        expires_delta=timedelta(seconds=-1),  # Already expired in the past
    )

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(expired_token)


def test_jwt_tampered_token_rejection():
    """Verify tampered or invalid JWT signatures are rejected."""
    subject_id = str(uuid.uuid4())
    valid_token = create_access_token(subject=subject_id)

    # Tamper with the payload or signature portion
    parts = valid_token.split(".")
    # Mutate a character in the signature while keeping valid base64url length
    sig_chars = list(parts[2])
    sig_chars[0] = "B" if sig_chars[0] == "A" else "A"
    tampered_token = f"{parts[0]}.{parts[1]}.{''.join(sig_chars)}"

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(tampered_token)


def test_jwt_garbage_token_rejection():
    """Verify non-JWT strings raise jwt.DecodeError."""
    with pytest.raises(jwt.DecodeError):
        decode_access_token("this.is.not.a.valid.jwt")


# =====================================================================
# 3. User SQLAlchemy Model Tests
# =====================================================================

def test_user_model_attributes_and_defaults():
    """Verify User model initializes with valid attributes and default active state."""
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="analyst@siftrix.com",
        hashed_password="scrypt$test$hash",
        full_name="Cyber Analyst",
    )

    assert isinstance(user.id, uuid.UUID)
    assert user.id == user_id
    assert user.id.version == 4
    assert user.email == "analyst@siftrix.com"
    assert user.hashed_password == "scrypt$test$hash"
    assert user.full_name == "Cyber Analyst"
    assert repr(user).startswith("<User id=")


def test_user_model_db_table_creation_and_persistence():
    """Verify User model table creates in DB and persists record with auto UUID and timestamps."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from app.core.database import Base

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = Session()
    try:
        user = User(
            email="new_analyst@siftrix.com",
            hashed_password=hash_password("ComplexP@ss123!"),
            full_name="Fatima Noor",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.id is not None
        assert isinstance(user.id, uuid.UUID)
        assert user.id.version == 4
        assert user.is_active is True
        assert user.created_at is not None
        assert user.updated_at is not None

        # Query back
        queried = db.query(User).filter(User.email == "new_analyst@siftrix.com").first()
        assert queried is not None
        assert queried.id == user.id
        assert verify_password("ComplexP@ss123!", queried.hashed_password) is True
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


# =====================================================================
# 4. Pydantic Auth Schema Tests
# =====================================================================

def test_user_register_request_schema_normalization():
    """Verify registration schema normalizes email and cleans whitespace in full name."""
    payload = {
        "email": "  Analyst.One@Example.COM  ",
        "password": "StrongPassword123!",
        "full_name": "  Maimoona   Ibrahimi  ",
    }
    req = UserRegisterRequest(**payload)

    assert req.email == "analyst.one@example.com"
    assert req.full_name == "Maimoona Ibrahimi"
    assert req.password == "StrongPassword123!"


def test_user_register_request_validation_errors():
    """Verify invalid registration inputs trigger ValidationError."""
    # Invalid email
    with pytest.raises(ValidationError):
        UserRegisterRequest(email="not-an-email", password="ValidPassword123!", full_name="Valid Name")

    # Password too short (<8 chars)
    with pytest.raises(ValidationError):
        UserRegisterRequest(email="valid@example.com", password="short", full_name="Valid Name")

    # Name too short (<2 chars)
    with pytest.raises(ValidationError):
        UserRegisterRequest(email="valid@example.com", password="ValidPassword123!", full_name="A")


def test_user_login_request_schema_normalization():
    """Verify login schema normalizes email to lowercase."""
    req = UserLoginRequest(email="  ANALYST@EXAMPLE.COM  ", password="secretpassword")
    assert req.email == "analyst@example.com"
    assert req.password == "secretpassword"


def test_token_response_and_payload_schemas():
    """Verify TokenResponse and TokenPayload validate correct types."""
    from datetime import datetime, timezone
    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    user_resp = UserResponse(
        id=user_id,
        email="analyst@example.com",
        full_name="Analyst Name",
        is_active=True,
        created_at=now,
        updated_at=now,
    )

    token_resp = TokenResponse(
        access_token="sample.jwt.token",
        token_type="bearer",
        user=user_resp,
    )
    assert token_resp.access_token == "sample.jwt.token"
    assert token_resp.token_type == "bearer"
    assert token_resp.user.email == "analyst@example.com"

    payload = TokenPayload(sub=str(user_id), exp=1700000000, email="analyst@example.com")
    assert payload.sub == str(user_id)
    assert payload.exp == 1700000000


# =====================================================================
# 5. JWT Secret Key Validation & Production Enforcement Tests
# =====================================================================

def test_production_missing_jwt_secret_rejected(monkeypatch):
    """Verify missing or blank JWT secret in production is rejected."""
    # Production missing secret via RAILWAY_ENVIRONMENT
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)

    with pytest.raises(ValidationError) as excinfo:
        Settings()
    assert "strictly required in production" in str(excinfo.value)

    # Production blank/empty secret via RAILWAY_ENVIRONMENT
    with pytest.raises(ValidationError) as excinfo:
        Settings(JWT_SECRET_KEY="")
    assert "strictly required in production" in str(excinfo.value)

    # Production whitespace secret via RAILWAY_ENVIRONMENT
    with pytest.raises(ValidationError) as excinfo:
        Settings(JWT_SECRET_KEY="   ")
    assert "strictly required in production" in str(excinfo.value)

    # Production None secret via RAILWAY_ENVIRONMENT
    with pytest.raises(ValidationError) as excinfo:
        Settings(JWT_SECRET_KEY=None)
    assert "strictly required in production" in str(excinfo.value)

    # Production missing secret via ENVIRONMENT=production
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")

    with pytest.raises(ValidationError) as excinfo:
        Settings()
    assert "strictly required in production" in str(excinfo.value)

    with pytest.raises(ValidationError) as excinfo:
        Settings(ENVIRONMENT="production", JWT_SECRET_KEY="")
    assert "strictly required in production" in str(excinfo.value)


def test_production_default_jwt_secret_rejected(monkeypatch):
    """Verify default development JWT secret in production is strictly rejected."""
    dev_default = "siftrix-development-only-jwt-secret-do-not-use-in-production"

    # Via RAILWAY_ENVIRONMENT
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    with pytest.raises(ValidationError) as excinfo:
        Settings(JWT_SECRET_KEY=dev_default)
    assert "strictly required in production" in str(excinfo.value)

    # Via ENVIRONMENT=production
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(ValidationError) as excinfo:
        Settings(JWT_SECRET_KEY=dev_default)
    assert "strictly required in production" in str(excinfo.value)

    # Via keyword argument ENVIRONMENT='production'
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    with pytest.raises(ValidationError) as excinfo:
        Settings(ENVIRONMENT="production", JWT_SECRET_KEY=dev_default)
    assert "strictly required in production" in str(excinfo.value)


def test_production_jwt_secret_shorter_than_32_chars_rejected(monkeypatch):
    """Verify production JWT secret shorter than 32 characters is rejected."""
    # Via RAILWAY_ENVIRONMENT with 31 characters
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    with pytest.raises(ValidationError) as excinfo:
        Settings(JWT_SECRET_KEY="a" * 31)
    assert "at least 32 characters" in str(excinfo.value)

    # Via RAILWAY_ENVIRONMENT with a short 16-character secret
    with pytest.raises(ValidationError) as excinfo:
        Settings(JWT_SECRET_KEY="short-secret-123")
    assert "at least 32 characters" in str(excinfo.value)

    # Via ENVIRONMENT=production with short secret
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(ValidationError) as excinfo:
        Settings(JWT_SECRET_KEY="short-prod-secret")
    assert "at least 32 characters" in str(excinfo.value)

    # Via keyword argument ENVIRONMENT='production'
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    with pytest.raises(ValidationError) as excinfo:
        Settings(ENVIRONMENT="production", JWT_SECRET_KEY="short-prod-secret")
    assert "at least 32 characters" in str(excinfo.value)


def test_production_valid_jwt_secret_accepted(monkeypatch):
    """Verify strong production JWT secrets of 32+ characters are accepted."""
    # Exactly 32 characters via RAILWAY_ENVIRONMENT
    exact_32_secret = "0123456789abcdef0123456789abcdef"
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    s1 = Settings(JWT_SECRET_KEY=exact_32_secret)
    assert s1.JWT_SECRET_KEY == exact_32_secret

    # Long 64-character secret via RAILWAY_ENVIRONMENT
    long_secret = "a" * 64
    s2 = Settings(JWT_SECRET_KEY=long_secret)
    assert s2.JWT_SECRET_KEY == long_secret

    # Via ENVIRONMENT=production
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    prod_env_secret = "custom-secure-production-jwt-secret-key-32chars!!"
    s3 = Settings(JWT_SECRET_KEY=prod_env_secret)
    assert s3.JWT_SECRET_KEY == prod_env_secret

    # Via keyword argument ENVIRONMENT='production'
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    s4 = Settings(ENVIRONMENT="production", JWT_SECRET_KEY=prod_env_secret)
    assert s4.JWT_SECRET_KEY == prod_env_secret


def test_jwt_secret_local_development_fallback(monkeypatch):
    """Verify local development fallback behavior remains intact."""
    dev_default = "siftrix-development-only-jwt-secret-do-not-use-in-production"

    # Ensure no production environment variables are active
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)

    # 1. Unset secret defaults to development fallback
    s_default = Settings()
    assert s_default.JWT_SECRET_KEY == dev_default

    # 2. Blank or whitespace secret falls back to dev default
    s_blank = Settings(JWT_SECRET_KEY="   ")
    assert s_blank.JWT_SECRET_KEY == dev_default

    # 3. None falls back to dev default
    s_none = Settings(JWT_SECRET_KEY=None)
    assert s_none.JWT_SECRET_KEY == dev_default

    # 4. Custom local secret is preserved (even if short)
    s_custom_short = Settings(JWT_SECRET_KEY="local-dev-key")
    assert s_custom_short.JWT_SECRET_KEY == "local-dev-key"

    # 5. Explicit ENVIRONMENT='development' preserves dev default
    s_dev_explicit = Settings(ENVIRONMENT="development")
    assert s_dev_explicit.JWT_SECRET_KEY == dev_default

@pytest.mark.parametrize(
    "reserved_claim,value",
    [
        ("sub", "attacker-id"),
        ("iat", 0),
        ("exp", 9999999999),
    ],
)
def test_jwt_rejects_reserved_claim_overrides(reserved_claim, value):
    """Additional claims must not override reserved JWT security claims."""
    with pytest.raises(ValueError, match="reserved JWT claims"):
        create_access_token(
            subject=str(uuid.uuid4()),
            extra_claims={reserved_claim: value},
        )