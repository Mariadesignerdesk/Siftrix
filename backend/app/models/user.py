"""SQLAlchemy model for user authentication, accounts, and security identity."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Uuid

from app.core.database import Base


class User(Base):
    """Stores registered user accounts and credentials with tenant isolation."""

    __tablename__ = "users"

    # Native PostgreSQL UUID Primary Key
    id = Column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        doc="Unique identifier for the user account (UUIDv4).",
    )

    # Authentication credentials & identity
    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        doc="Unique user email address, normalized to lowercase.",
    )
    hashed_password = Column(
        String(255),
        nullable=False,
        doc="Salted scrypt password hash.",
    )
    full_name = Column(
        String(100),
        nullable=False,
        doc="User's full display name.",
    )

    # Account status flags
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether the user account is active and permitted to authenticate.",
    )

    # Timestamps (Timezone-Aware)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
        doc="Account creation timestamp (UTC).",
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        doc="Account profile update timestamp (UTC).",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} is_active={self.is_active}>"
