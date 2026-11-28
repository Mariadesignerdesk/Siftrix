"""Gamification and rewards API endpoints."""
import logging
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import resolve_owner_id_for_scan, get_optional_current_user
from app.models.user import User
from app.models.gamification import GamificationProfile
from app.schemas.gamification import (
    UserGamificationProfileResponse,
    AchievementBadgeResponse,
    LeaderboardEntryResponse,
    ProfileVisibilityUpdateRequest,
)
from app.services.gamification_service import (
    get_or_create_profile,
    serialize_profile,
    serialize_badges,
    calculate_level_info,
    calculate_tier,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gamification", tags=["Gamification"])


@router.get("/profile", response_model=UserGamificationProfileResponse)
def get_user_profile(
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> UserGamificationProfileResponse:
    """Retrieve canonical gamification profile for current user or guest session."""
    is_user = current_user is not None
    profile = get_or_create_profile(db, owner_id, is_user)
    db.commit()
    return serialize_profile(profile)


@router.patch("/profile/visibility", response_model=UserGamificationProfileResponse)
def update_profile_visibility(
    payload: ProfileVisibilityUpdateRequest,
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> UserGamificationProfileResponse:
    """Opt-in or opt-out of public leaderboard rankings."""
    is_user = current_user is not None
    profile = get_or_create_profile(db, owner_id, is_user)
    profile.is_leaderboard_visible = payload.is_leaderboard_visible
    db.commit()
    db.refresh(profile)
    return serialize_profile(profile)


@router.get("/badges", response_model=List[AchievementBadgeResponse])
def get_user_badges(
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[AchievementBadgeResponse]:
    """Retrieve all achievement badges with real progress tracking."""
    is_user = current_user is not None
    profile = get_or_create_profile(db, owner_id, is_user)
    db.commit()
    return serialize_badges(profile)


@router.get("/leaderboard", response_model=List[LeaderboardEntryResponse])
def get_leaderboard(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[LeaderboardEntryResponse]:
    """Retrieve real registered user rankings. Excludes PII, emails, and fabricated accuracy rates."""
    # Only registered users with is_leaderboard_visible == True appear on the public leaderboard
    profiles = (
        db.query(GamificationProfile)
        .filter(
            GamificationProfile.user_id.isnot(None),
            GamificationProfile.is_leaderboard_visible.is_(True),
        )
        .order_by(GamificationProfile.total_xp.desc(), GamificationProfile.scans_completed.desc())
        .limit(50)
        .all()
    )

    calling_user_id = current_user.id if current_user else None
    results = []

    for rank_idx, prof in enumerate(profiles, start=1):
        _, title, _ = calculate_level_info(prof.total_xp)
        tier = calculate_tier(prof.total_xp)
        is_current = (calling_user_id is not None) and (prof.user_id == calling_user_id)

        # Pseudonymous handle derived strictly from pseudonym (no email exposure!)
        handle_slug = prof.pseudonym.lower().replace(" ", "_").replace("-", "_")

        results.append(
            LeaderboardEntryResponse(
                rank=rank_idx,
                name=prof.pseudonym,
                handle=f"@{handle_slug}",
                title=title,
                xp=prof.total_xp,
                scansCount=prof.scans_completed,
                accuracyRate=None,  # Mandated: never return fabricated accuracy rates
                tier=tier,
                isCurrentUser=is_current,
            )
        )

    return results
