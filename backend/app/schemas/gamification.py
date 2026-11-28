"""Pydantic schemas for gamification, rewards, leaderboards, and notifications."""
import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AchievementBadgeProgress(BaseModel):
    """Progress towards unlocking an achievement badge."""
    current: int = Field(..., ge=0, description="Current progress value")
    max: int = Field(..., ge=1, description="Threshold required for unlock")


class AchievementBadgeResponse(BaseModel):
    """Achievement badge specification matching frontend TypeScript contract."""
    id: str
    title: str
    description: str
    icon: str
    category: str  # 'investigation' | 'defense' | 'streak' | 'mastery'
    unlocked: bool
    unlockedAt: Optional[str] = None
    xpReward: int
    progress: AchievementBadgeProgress


class UserGamificationProfileResponse(BaseModel):
    """Gamification profile matching frontend TypeScript contract."""
    xp: int = Field(..., ge=0, description="Total verified XP (base scan XP + claimed badge rewards)")
    level: int = Field(..., ge=1, description="Calculated level (1 + xp // 500)")
    levelTitle: str = Field(..., description="Level title string")
    currentLevelXp: int = Field(..., ge=0, description="XP progress in current level")
    nextLevelXp: int = Field(500, description="XP required to complete level (500)")
    scansCompleted: int = Field(..., ge=0, description="Total eligible scans completed")
    threatsNeutralized: int = Field(..., ge=0, description="Total malicious threats isolated")
    dailyStreak: int = Field(..., ge=0, description="Active consecutive UTC daily streak")
    lastActiveDate: Optional[str] = None
    isLeaderboardVisible: bool = Field(False, description="Opt-in flag for public leaderboard")
    pseudonym: str = Field(..., description="Privacy-safe sentinel display pseudonym")


class LeaderboardEntryResponse(BaseModel):
    """Public leaderboard entry. Strictly excludes PII, email, and fabricated accuracy."""
    rank: int = Field(..., ge=1)
    name: str = Field(..., description="Pseudonymous sentinel display name (e.g. Analyst S-9B21)")
    handle: str = Field(..., description="Pseudonymous handle (e.g. @analyst_9b21)")
    title: str = Field(..., description="Level title based on XP")
    xp: int = Field(..., ge=0)
    scansCount: int = Field(..., ge=0)
    accuracyRate: Optional[str] = Field(None, description="Omitted or null to prevent fabricated metrics")
    tier: str = Field(..., description="Gold Sentinel | Silver Warden | Bronze Guardian | Field Analyst")
    isCurrentUser: bool = Field(False, description="True if this row belongs to the requesting caller")


class AppNotificationResponse(BaseModel):
    """In-app notification item matching frontend TypeScript contract."""
    id: str
    title: str
    message: str
    type: str  # 'alert' | 'threat' | 'system' | 'achievement'
    timestamp: str
    read: bool
    link: Optional[str] = None


class ProfileVisibilityUpdateRequest(BaseModel):
    """Request to update leaderboard visibility opt-in preference."""
    is_leaderboard_visible: bool
