"""Gamification engine: concurrency-safe XP awards, badge evaluations, streaks, and migrations."""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import update, func
from sqlalchemy.orm import Session

from app.models.scan import ScanRecord
from app.models.user import User
from app.models.gamification import GamificationProfile, NotificationRecord
from app.schemas.gamification import (
    AchievementBadgeResponse,
    AchievementBadgeProgress,
    UserGamificationProfileResponse,
    LeaderboardEntryResponse,
    AppNotificationResponse,
)

logger = logging.getLogger(__name__)

LEVEL_TITLES = [
    "Novice Investigator",
    "Junior SOC Analyst",
    "Senior Threat Hunter",
    "Principal Cyber Sentinel",
    "Master Threat Defense Architect",
]

# Exact 8 badges matching frontend TypeScript definitions
BADGE_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "id": "badge_first_scan",
        "title": "First Recon Probe",
        "description": "Completed your first automated threat scan on SIFTRIX.",
        "icon": "target",
        "category": "investigation",
        "xpReward": 100,
        "max": 1,
    },
    {
        "id": "badge_phish_catcher",
        "title": "Phishing Interceptor",
        "description": "Intercepted and isolated a credential-harvesting phishing domain.",
        "icon": "phish",
        "category": "defense",
        "xpReward": 250,
        "max": 5,
    },
    {
        "id": "badge_urdu_guardian",
        "title": "Bilingual Sentinel",
        "description": "Reviewed Urdu localized threat advisories and safety advisories.",
        "icon": "globe",
        "category": "mastery",
        "xpReward": 200,
        "max": 3,
    },
    {
        "id": "badge_streak_3",
        "title": "Relentless Watch",
        "description": "Maintained a 3-day consecutive threat investigation streak.",
        "icon": "flame",
        "category": "streak",
        "xpReward": 300,
        "max": 3,
    },
    {
        "id": "badge_bec_neutralizer",
        "title": "Executive Shield",
        "description": "Neutralized an impersonated Business Email Compromise (BEC) attack.",
        "icon": "shield",
        "category": "defense",
        "xpReward": 400,
        "max": 3,
    },
    {
        "id": "badge_ssrf_detector",
        "title": "Perimeter Bastion",
        "description": "Detected and deflected a Server-Side Request Forgery attempt.",
        "icon": "zap",
        "category": "mastery",
        "xpReward": 500,
        "max": 1,
    },
    {
        "id": "badge_scan_century",
        "title": "Centurion Auditor",
        "description": "Analyze 100 enterprise URLs, SMS alerts, and email payloads.",
        "icon": "award",
        "category": "investigation",
        "xpReward": 750,
        "max": 100,
    },
    {
        "id": "badge_streak_7",
        "title": "Unbroken Aegis",
        "description": "Complete 7 consecutive days of active cybersecurity patrols.",
        "icon": "crown",
        "category": "streak",
        "xpReward": 1000,
        "max": 7,
    },
]


def calculate_level_info(total_xp: int) -> Tuple[int, str, int]:
    """Calculate level, title, and current-level progress from total XP (500 XP per level)."""
    level = (total_xp // 500) + 1
    idx = min(level - 1, len(LEVEL_TITLES) - 1)
    title = LEVEL_TITLES[idx]
    current_level_xp = total_xp % 500
    return level, title, current_level_xp


def calculate_tier(total_xp: int) -> str:
    """Calculate tier designation from total XP matching frontend rules."""
    if total_xp >= 3500:
        return "Gold Sentinel"
    if total_xp >= 1250:
        return "Silver Warden"
    if total_xp >= 800:
        return "Bronze Guardian"
    return "Field Analyst"


def generate_pseudonym(owner_id: uuid.UUID) -> str:
    """Generate privacy-safe sentinel pseudonym without exposing emails or names."""
    short_hash = owner_id.hex[:4].upper()
    return f"Analyst S-{short_hash}"


def calculate_utc_daily_streak(db: Session, owner_id: uuid.UUID) -> int:
    """Calculate the active consecutive UTC day streak strictly from real scan records.
    
    If the most recent scan is > 1 day ago, the streak is broken (returns 0).
    """
    records = (
        db.query(ScanRecord.created_at)
        .filter(ScanRecord.user_id == owner_id)
        .order_by(ScanRecord.created_at.desc())
        .all()
    )
    if not records:
        return 0

    # Collect distinct UTC dates in descending order
    scan_dates = set()
    for (dt,) in records:
        if dt is not None:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            scan_dates.add(dt.astimezone(timezone.utc).date())

    if not scan_dates:
        return 0

    sorted_dates = sorted(scan_dates, reverse=True)
    today = datetime.now(timezone.utc).date()
    most_recent = sorted_dates[0]

    # If the user hasn't scanned today or yesterday, the streak is broken
    if most_recent < today - timedelta(days=1):
        return 0

    # Start counting streak from most recent active date
    streak = 1
    expected_prev = most_recent - timedelta(days=1)
    for next_date in sorted_dates[1:]:
        if next_date == expected_prev:
            streak += 1
            expected_prev = next_date - timedelta(days=1)
        elif next_date < expected_prev:
            break

    return streak


def get_or_create_profile(db: Session, owner_id: uuid.UUID, is_user: bool) -> GamificationProfile:
    """Retrieve or initialize a gamification profile with opt-in defaults."""
    query = db.query(GamificationProfile)
    if is_user:
        profile = query.filter(GamificationProfile.user_id == owner_id).first()
    else:
        profile = query.filter(GamificationProfile.session_id == owner_id).first()

    if profile is not None:
        return profile

    profile = GamificationProfile(
        id=uuid.uuid4(),
        user_id=owner_id if is_user else None,
        session_id=owner_id if not is_user else None,
        base_scan_xp=0,
        total_xp=0,
        level=1,
        scans_completed=0,
        threats_neutralized=0,
        daily_streak=0,
        last_active_date=None,
        is_leaderboard_visible=False,  # Safeguard: opt-in default false
        pseudonym=generate_pseudonym(owner_id),
        unlocked_badges={},
    )
    db.add(profile)
    db.flush()
    return profile


def evaluate_and_unlock_badges(
    db: Session,
    profile: GamificationProfile,
    owner_id: uuid.UUID,
    is_user: bool,
    now: datetime,
) -> List[Dict[str, Any]]:
    """Evaluate badge unlock conditions and atomically award distinct badge reward XP."""
    unlocked_badges = dict(profile.unlocked_badges or {})
    newly_unlocked = []

    # Check whether any scan for this owner has an SSRF check blocked finding
    has_ssrf_block = False
    ssrf_check = (
        db.query(ScanRecord)
        .filter(
            ScanRecord.user_id == owner_id,
            ScanRecord.agent_findings.isnot(None),
        )
        .all()
    )
    for scan in ssrf_check:
        findings = scan.agent_findings or {}
        url_findings = findings.get("url_findings") or {}
        if isinstance(url_findings, dict) and url_findings.get("validation_status") == "blocked":
            has_ssrf_block = True
            break
        elif isinstance(url_findings, list):
            for uf in url_findings:
                if isinstance(uf, dict) and uf.get("validation_status") == "blocked":
                    has_ssrf_block = True
                    break
        if has_ssrf_block:
            break

    for badge in BADGE_DEFINITIONS:
        badge_id = badge["id"]
        if badge_id in unlocked_badges:
            continue

        unlocked = False
        if badge_id == "badge_first_scan" and profile.scans_completed >= 1:
            unlocked = True
        elif badge_id == "badge_scan_century" and profile.scans_completed >= 100:
            unlocked = True
        elif badge_id == "badge_phish_catcher" and profile.threats_neutralized >= 5:
            unlocked = True
        elif badge_id == "badge_streak_3" and profile.daily_streak >= 3:
            unlocked = True
        elif badge_id == "badge_streak_7" and profile.daily_streak >= 7:
            unlocked = True
        elif badge_id == "badge_ssrf_detector" and has_ssrf_block:
            unlocked = True
        # Note: badge_bec_neutralizer and badge_urdu_guardian remain strictly locked
        # until explicit event tracking is introduced. No fabricated unlocks.

        if unlocked:
            reward = badge["xpReward"]
            unlocked_badges[badge_id] = {
                "unlocked_at": now.isoformat(),
                "reward_xp": reward,
            }
            newly_unlocked.append(badge)

            # Create in-app achievement notification
            notif = NotificationRecord(
                id=uuid.uuid4(),
                user_id=owner_id if is_user else None,
                session_id=owner_id if not is_user else None,
                title=f"Achievement Unlocked: {badge['title']}",
                message=f"You unlocked {badge['title']} and earned +{reward} XP!",
                type="achievement",
                link="/rewards",
                created_at=now,
            )
            db.add(notif)

    if newly_unlocked:
        profile.unlocked_badges = unlocked_badges
        badge_reward_total = sum(b["reward_xp"] for b in unlocked_badges.values())
        profile.total_xp = profile.base_scan_xp + badge_reward_total
        profile.level, _, _ = calculate_level_info(profile.total_xp)

    return newly_unlocked


def award_scan_rewards(db: Session, scan_record: ScanRecord, owner_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """Concurrency-safe, database-enforced scan reward distribution.
    
    Uses atomic conditional update on scans.xp_awarded_at to guarantee exactly-once execution.
    """
    now = datetime.now(timezone.utc)

    # 1. Atomic check: only the transaction that successfully sets xp_awarded_at may proceed
    stmt = (
        update(ScanRecord)
        .where(ScanRecord.id == scan_record.id, ScanRecord.xp_awarded_at.is_(None))
        .values(xp_awarded_at=now)
    )
    res = db.execute(stmt)
    if res.rowcount != 1:
        logger.debug(f"Scan {scan_record.id} already awarded XP or concurrent attempt detected; skipping.")
        return None

    # 2. Check if owner is a registered user or guest
    is_user = db.query(User).filter(User.id == owner_id).first() is not None

    # 3. Lock gamification profile with SELECT ... FOR UPDATE to serialize increments
    if is_user:
        profile = (
            db.query(GamificationProfile)
            .filter(GamificationProfile.user_id == owner_id)
            .with_for_update()
            .first()
        )
    else:
        profile = (
            db.query(GamificationProfile)
            .filter(GamificationProfile.session_id == owner_id)
            .with_for_update()
            .first()
        )

    if profile is None:
        profile = get_or_create_profile(db, owner_id, is_user)

    # 4. Award base scan XP (+100 for malicious, +50 for safe/suspicious/benign)
    base_xp = 100 if scan_record.verdict == "malicious" else 50
    profile.base_scan_xp += base_xp
    profile.scans_completed += 1
    if scan_record.verdict == "malicious":
        profile.threats_neutralized += 1

    profile.last_active_date = now
    profile.daily_streak = calculate_utc_daily_streak(db, owner_id)

    # Re-derive total_xp and level atomically
    badge_reward_total = sum(b.get("reward_xp", 0) for b in (profile.unlocked_badges or {}).values())
    profile.total_xp = profile.base_scan_xp + badge_reward_total
    old_level = profile.level
    profile.level, _, _ = calculate_level_info(profile.total_xp)

    # 5. Evaluate newly unlocked badges
    new_badges = evaluate_and_unlock_badges(db, profile, owner_id, is_user, now)

    # 6. Create scan completion notification
    notif = NotificationRecord(
        id=uuid.uuid4(),
        user_id=owner_id if is_user else None,
        session_id=owner_id if not is_user else None,
        title="Malicious Threat Isolated" if scan_record.verdict == "malicious" else "Threat Investigation Completed",
        message=f"Analyzed {scan_record.target_type} ({scan_record.verdict.upper()}). +{base_xp} XP earned.",
        type="threat" if scan_record.verdict == "malicious" else "system",
        link=f"/scans/{scan_record.id}",
        created_at=now,
    )
    db.add(notif)
    db.flush()

    return {
        "xp_earned": base_xp,
        "total_xp": profile.total_xp,
        "level": profile.level,
        "leveled_up": profile.level > old_level,
        "newly_unlocked_badges": [b["id"] for b in new_badges],
    }


def migrate_guest_gamification(db: Session, guest_session_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Atomically merge guest gamification profile and notifications into registered user account."""
    if guest_session_id == user_id:
        return

    # Guard against registered user impersonation
    if db.query(User).filter(User.id == guest_session_id).first() is not None:
        logger.warning(f"Refused gamification migration from registered user UUID: {guest_session_id}")
        return

    guest_profile = (
        db.query(GamificationProfile)
        .filter(GamificationProfile.session_id == guest_session_id)
        .with_for_update()
        .first()
    )

    now = datetime.now(timezone.utc)

    if guest_profile is not None:
        user_profile = (
            db.query(GamificationProfile)
            .filter(GamificationProfile.user_id == user_id)
            .with_for_update()
            .first()
        )

        if user_profile is None:
            # Reassign guest profile directly to the registered user
            guest_profile.user_id = user_id
            guest_profile.session_id = None
            guest_profile.pseudonym = generate_pseudonym(user_id)
            guest_profile.daily_streak = calculate_utc_daily_streak(db, user_id)
            db.flush()
        else:
            # Merge stats
            user_profile.base_scan_xp += guest_profile.base_scan_xp
            user_profile.scans_completed += guest_profile.scans_completed
            user_profile.threats_neutralized += guest_profile.threats_neutralized
            if guest_profile.last_active_date:
                if not user_profile.last_active_date or guest_profile.last_active_date > user_profile.last_active_date:
                    user_profile.last_active_date = guest_profile.last_active_date

            # Merge unlocked badges: union without double rewards
            user_badges = dict(user_profile.unlocked_badges or {})
            guest_badges = dict(guest_profile.unlocked_badges or {})
            for b_id, b_data in guest_badges.items():
                if b_id not in user_badges:
                    user_badges[b_id] = b_data
                else:
                    earliest_unlock = min(user_badges[b_id].get("unlocked_at", ""), b_data.get("unlocked_at", ""))
                    user_badges[b_id]["unlocked_at"] = earliest_unlock

            user_profile.unlocked_badges = user_badges
            badge_reward_total = sum(b.get("reward_xp", 0) for b in user_badges.values())
            user_profile.total_xp = user_profile.base_scan_xp + badge_reward_total
            user_profile.level, _, _ = calculate_level_info(user_profile.total_xp)
            user_profile.daily_streak = calculate_utc_daily_streak(db, user_id)

            # Remove migrated guest profile
            db.delete(guest_profile)
            db.flush()

    # Migrate notifications
    db.query(NotificationRecord).filter(NotificationRecord.session_id == guest_session_id).update(
        {NotificationRecord.user_id: user_id, NotificationRecord.session_id: None},
        synchronize_session=False,
    )
    db.flush()


def serialize_profile(profile: GamificationProfile) -> UserGamificationProfileResponse:
    """Format GamificationProfile model as Pydantic response."""
    level, title, current_level_xp = calculate_level_info(profile.total_xp)
    return UserGamificationProfileResponse(
        xp=profile.total_xp,
        level=level,
        levelTitle=title,
        currentLevelXp=current_level_xp,
        nextLevelXp=500,
        scansCompleted=profile.scans_completed,
        threatsNeutralized=profile.threats_neutralized,
        dailyStreak=profile.daily_streak,
        lastActiveDate=profile.last_active_date.isoformat() if profile.last_active_date else None,
        isLeaderboardVisible=profile.is_leaderboard_visible,
        pseudonym=profile.pseudonym,
    )


def serialize_badges(profile: GamificationProfile) -> List[AchievementBadgeResponse]:
    """Format badges matching frontend AchievementBadge contract."""
    unlocked_map = profile.unlocked_badges or {}
    results = []

    for badge in BADGE_DEFINITIONS:
        b_id = badge["id"]
        is_unlocked = b_id in unlocked_map
        unlocked_at = unlocked_map[b_id].get("unlocked_at") if is_unlocked else None

        current_val = 0
        if b_id == "badge_first_scan":
            current_val = min(profile.scans_completed, 1)
        elif b_id == "badge_scan_century":
            current_val = min(profile.scans_completed, 100)
        elif b_id == "badge_phish_catcher":
            current_val = min(profile.threats_neutralized, 5)
        elif b_id == "badge_streak_3":
            current_val = min(profile.daily_streak, 3)
        elif b_id == "badge_streak_7":
            current_val = min(profile.daily_streak, 7)
        elif b_id == "badge_ssrf_detector":
            current_val = 1 if is_unlocked else 0
        # badge_bec_neutralizer and badge_urdu_guardian remain at 0

        results.append(
            AchievementBadgeResponse(
                id=b_id,
                title=badge["title"],
                description=badge["description"],
                icon=badge["icon"],
                category=badge["category"],
                unlocked=is_unlocked,
                unlockedAt=unlocked_at,
                xpReward=badge["xpReward"],
                progress=AchievementBadgeProgress(current=current_val, max=badge["max"]),
            )
        )

    return results
