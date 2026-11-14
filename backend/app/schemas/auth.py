"""Pydantic data schemas for authentication, user profiles, and JWT tokens."""
import re
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

# RFC 5322 compatible email pattern matching frontend input validation
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


class UserRegisterRequest(BaseModel):
    """Payload for user account registration."""

    email: str = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Account password (minimum 8 characters)",
    )
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="User full display name (minimum 2 characters)",
    )

    @field_validator("email", mode="before")
    @classmethod
    def validate_and_normalize_email(cls, v: str) -> str:
        """Strip and normalize email to lowercase, verifying standard email format."""
        if not isinstance(v, str):
            raise ValueError("Email must be a string")
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned):
            raise ValueError("Invalid email format")
        return cleaned

    @field_validator("full_name", mode="before")
    @classmethod
    def clean_full_name(cls, v: str) -> str:
        """Strip and collapse irregular whitespace in full name."""
        if not isinstance(v, str):
            raise ValueError("Full name must be a string")
        cleaned = " ".join(v.strip().split())
        if len(cleaned) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return cleaned


class UserLoginRequest(BaseModel):
    """Payload for user credentials sign-in."""

    email: str = Field(..., description="User registered email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """Strip and normalize email to lowercase."""
        if not isinstance(v, str):
            raise ValueError("Email must be a string")
        return v.strip().lower()


class UserResponse(BaseModel):
    """Public user identity and profile response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    """JWT bearer token response returned upon successful authentication."""

    access_token: str = Field(..., description="Signed JWT access token")
    token_type: str = Field(default="bearer", description="Token type (bearer)")
    user: UserResponse = Field(..., description="Authenticated user profile")


class TokenPayload(BaseModel):
    """Validated claims extracted from an access token payload."""

    sub: str = Field(..., description="Subject identifier (user UUID)")
    exp: int = Field(..., description="Expiration timestamp (UNIX epoch)")
    iat: Optional[int] = Field(default=None, description="Issued at timestamp (UNIX epoch)")
    email: Optional[str] = Field(default=None, description="User email claim if present")
