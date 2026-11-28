"""Security notifications API endpoints with strict ownership enforcement."""
import logging
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import resolve_owner_id_for_scan, get_optional_current_user
from app.models.user import User
from app.models.gamification import NotificationRecord
from app.schemas.gamification import AppNotificationResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[AppNotificationResponse])
def get_user_notifications(
    limit: int = 50,
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[AppNotificationResponse]:
    """Retrieve security notifications strictly filtered by owner (tenant isolation)."""
    is_user = current_user is not None
    query = db.query(NotificationRecord)

    if is_user:
        query = query.filter(NotificationRecord.user_id == owner_id)
    else:
        query = query.filter(NotificationRecord.session_id == owner_id)

    records = query.order_by(NotificationRecord.created_at.desc()).limit(limit).all()

    return [
        AppNotificationResponse(
            id=str(r.id),
            title=r.title,
            message=r.message,
            type=r.type,
            timestamp=r.created_at.isoformat(),
            read=r.read,
            link=r.link,
        )
        for r in records
    ]


@router.patch("/{notification_id}/read", response_model=AppNotificationResponse)
def mark_notification_read(
    notification_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> AppNotificationResponse:
    """Mark a notification as read with strict ownership check."""
    is_user = current_user is not None
    query = db.query(NotificationRecord).filter(NotificationRecord.id == notification_id)

    if is_user:
        record = query.filter(NotificationRecord.user_id == owner_id).first()
    else:
        record = query.filter(NotificationRecord.session_id == owner_id).first()

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied",
        )

    record.read = True
    db.commit()
    db.refresh(record)

    return AppNotificationResponse(
        id=str(record.id),
        title=record.title,
        message=record.message,
        type=record.type,
        timestamp=record.created_at.isoformat(),
        read=record.read,
        link=record.link,
    )


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Mark all active notifications as read for current owner."""
    is_user = current_user is not None
    query = db.query(NotificationRecord)

    if is_user:
        count = query.filter(NotificationRecord.user_id == owner_id, NotificationRecord.read.is_(False)).update(
            {NotificationRecord.read: True}, synchronize_session=False
        )
    else:
        count = query.filter(NotificationRecord.session_id == owner_id, NotificationRecord.read.is_(False)).update(
            {NotificationRecord.read: True}, synchronize_session=False
        )

    db.commit()
    return {"message": f"Marked {count} notifications as read", "updated_count": count}
