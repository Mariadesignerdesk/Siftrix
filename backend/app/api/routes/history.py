"""Scan history retrieval, detail inspection, and deletion endpoints."""
import logging
import math
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import require_owner_id_for_history
from app.schemas.common import TargetType, Verdict
from app.schemas.history import (
    ScanHistoryItem,
    ScanHistoryListResponse,
    ScanDetailResponse,
)
from app.services.scan_repository import (
    get_scan_record_by_id,
    list_scan_records,
    delete_scan_record,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("", response_model=ScanHistoryListResponse)
@router.get("/", response_model=ScanHistoryListResponse, include_in_schema=False)
def list_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    target_type: Optional[TargetType] = Query(None, description="Filter by target type"),
    verdict: Optional[Verdict] = Query(None, description="Filter by verdict"),
    owner_id: uuid.UUID = Depends(require_owner_id_for_history),
    db: Session = Depends(get_db),
) -> ScanHistoryListResponse:
    """Retrieve paginated scan history strictly filtered by the authenticated owner ID."""
    t_type = target_type.value if target_type else None
    v_type = verdict.value if verdict else None

    records, total = list_scan_records(
        db=db,
        user_id=owner_id,
        page=page,
        page_size=page_size,
        target_type=t_type,
        verdict=v_type,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    has_next = page < total_pages
    has_prev = page > 1

    items = [ScanHistoryItem.model_validate(r) for r in records]

    return ScanHistoryListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=has_next,
        has_prev=has_prev,
    )


@router.get("/{scan_id}", response_model=ScanDetailResponse)
def get_scan_detail(
    scan_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(require_owner_id_for_history),
    db: Session = Depends(get_db),
) -> ScanDetailResponse:
    """Retrieve full scan details for a specific scan belonging to the caller."""
    record = get_scan_record_by_id(db=db, scan_id=scan_id, user_id=owner_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan record not found",
        )
    return ScanDetailResponse.model_validate(record)


@router.delete("/{scan_id}")
def delete_scan(
    scan_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(require_owner_id_for_history),
    db: Session = Depends(get_db),
):
    """Delete a specific scan record belonging to the caller."""
    deleted = delete_scan_record(db=db, scan_id=scan_id, user_id=owner_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan record not found",
        )
    return {"status": "deleted", "id": str(scan_id)}
