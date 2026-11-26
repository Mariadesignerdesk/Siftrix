"""SQLAlchemy models for gamification profiles, achievements, and notifications."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, Index, CheckConstraint, ForeignKey, Uuid
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base

JSONType = JSON().with_variant(JSONB, "postgresql")


class GamificationProfile(Base):
    """User and guest gamification progress, XP balances, and achievement ledger."""

    __tablename__ = "gamification_profiles"

    id = Column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        doc="Unique identifier for the gamification profile (UUIDv4).",
    )

    # Ownership: strictly authenticated user OR guest session, never ambiguous
    user_id = Column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        index=True,
        doc="Owner user ID for authenticated accounts. Null for guest sessions.",
    )
    session_id = Column(
        Uuid,
        nullable=True,
        unique=True,
        index=True,
        doc="Owner guest session ID (UUIDv4). Null for authenticated accounts.",
    )

    # Core XP accounting: total_xp = base_scan_xp + sum(unlocked badge rewards)
    base_scan_xp = Column(Integer, nullable=False, default=0)
    total_xp = Column(Integer, nullable=False, default=0, index=True)
    level = Column(Integer, nullable=False, default=1)

    # Stats
    scans_completed = Column(Integer, nullable=False, default=0)
    threats_neutralized = Column(Integer, nullable=False, default=0)
    daily_streak = Column(Integer, nullable=False, default=0)
    last_active_date = Column(DateTime(timezone=True), nullable=True)

    # Privacy & Leaderboard (Opt-in by default, pseudonymous display)
    is_leaderboard_visible = Column(Boolean, nullable=False, default=False)
    pseudonym = Column(String(50), nullable=False)

    # Achievements: dict of {badge_id: {"unlocked_at": ISO_TIMESTAMP, "reward_xp": INT}}
    unlocked_badges = Column(JSONType, nullable=False, default=dict)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND session_id IS NULL) OR (user_id IS NULL AND session_id IS NOT NULL)",
            name="ck_gamification_profile_owner",
        ),
        Index("ix_gamification_profiles_leaderboard", "total_xp", "scans_completed"),
    )


class NotificationRecord(Base):
    """In-app security alerts, threat milestones, and achievement notifications."""

    __tablename__ = "notifications"

    id = Column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        doc="Unique identifier for the notification (UUIDv4).",
    )

    user_id = Column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    session_id = Column(
        Uuid,
        nullable=True,
        index=True,
    )

    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    type = Column(String(30), nullable=False)  # "alert", "threat", "system", "achievement"
    read = Column(Boolean, nullable=False, default=False, index=True)
    link = Column(String(255), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        CheckConstraint(
            "user_id IS NOT NULL OR session_id IS NOT NULL",
            name="ck_notifications_owner",
        ),
        Index("ix_notifications_user_read", "user_id", "read"),
        Index("ix_notifications_session_read", "session_id", "read"),
    )
