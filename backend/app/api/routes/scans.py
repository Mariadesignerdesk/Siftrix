"""Scan execution endpoints for messages, URLs, and unified payloads."""
import logging
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import resolve_owner_id_for_scan, get_optional_current_user
from app.models.user import User
from app.agents.orchestrator import orchestrator
from app.schemas.common import TargetType
from app.schemas.scan import (
    MessageScanRequest,
    URLScanRequest,
    UnifiedScanRequest,
    ScanResponse,
)
from app.services.scan_repository import save_scan_record
from app.services.gamification_service import award_scan_rewards

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scan", tags=["Scans"])


async def _execute_and_persist_scan(
    content: str,
    target_type: TargetType,
    sender: Optional[str],
    metadata: Optional[Dict[str, Any]],
    owner_id: uuid.UUID,
    db: Session,
    response: Response,
    current_user: Optional[User] = None,
) -> ScanResponse:
    """Unified pipeline: executes multi-agent scan, saves record, and sets guest session header."""
    # 1. Execute multi-agent orchestration
    scan_resp = await orchestrator.scan(
        content=content,
        target_type=target_type,
        sender=sender,
        metadata=metadata,
        user_id=owner_id,
    )

    # 2. Persist to database with explicit owner enforcement and transaction safety
    saved_record = save_scan_record(db=db, scan_resp=scan_resp, owner_id=owner_id)

    # 3. Award gamification XP and evaluate badge milestones
    try:
        award_scan_rewards(db=db, scan_record=saved_record, owner_id=owner_id)
    except Exception as e:
        logger.error(f"Error awarding gamification rewards for scan {saved_record.id}: {e}")

    # 4. Expose session token in response header only for unauthenticated guest requests
    if current_user is None:
        response.headers["X-Session-ID"] = str(owner_id)

    return scan_resp


@router.post("/message", response_model=ScanResponse)
async def scan_message(
    payload: MessageScanRequest,
    response: Response,
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ScanResponse:
    """Scan SMS, WhatsApp, or email text for social engineering lures."""
    return await _execute_and_persist_scan(
        content=payload.content,
        target_type=TargetType.MESSAGE,
        sender=payload.sender,
        metadata=None,
        owner_id=owner_id,
        db=db,
        response=response,
        current_user=current_user,
    )


@router.post("/url", response_model=ScanResponse)
async def scan_url(
    payload: URLScanRequest,
    response: Response,
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ScanResponse:
    """Scan URL link with pre-validated SSRF boundaries and threat intelligence."""
    return await _execute_and_persist_scan(
        content=payload.url,
        target_type=TargetType.URL,
        sender=None,
        metadata=None,
        owner_id=owner_id,
        db=db,
        response=response,
        current_user=current_user,
    )


@router.post("", response_model=ScanResponse)
@router.post("/", response_model=ScanResponse, include_in_schema=False)
async def scan_unified(
    payload: UnifiedScanRequest,
    response: Response,
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ScanResponse:
    """Universal scan endpoint accepting messages, URLs, or emails with optional metadata."""
    return await _execute_and_persist_scan(
        content=payload.content,
        target_type=payload.target_type,
        sender=None,
        metadata=payload.metadata,
        owner_id=owner_id,
        db=db,
        response=response,
        current_user=current_user,
    )
