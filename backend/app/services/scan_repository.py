"""Database repository for persisting scans and retrieving tenant-isolated scan history."""
import logging
import uuid
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.scan import ScanRecord
from app.schemas.scan import ScanResponse

logger = logging.getLogger(__name__)


def save_scan_record(db: Session, scan_resp: ScanResponse, owner_id: uuid.UUID) -> ScanRecord:
    """Persist a completed ScanResponse into PostgreSQL with explicit owner enforcement.

    Safeguard: owner_id is enforced directly to prevent client payloads from spoofing ownership.
    """
    record = ScanRecord(
        id=scan_resp.id,
        user_id=owner_id,  # Explicit owner enforcement
        target_type=scan_resp.target_type.value,
        target_content=scan_resp.target_content,
        overall_risk_score=scan_resp.overall_risk_score,
        verdict=scan_resp.verdict.value,
        risk_level=scan_resp.risk_level.value,
        summary_en=scan_resp.summary.en,
        summary_ur=scan_resp.summary.ur,
        recommendations_en=scan_resp.recommendations.en,
        recommendations_ur=scan_resp.recommendations.ur,
        agent_findings=scan_resp.agent_findings.model_dump(),
        created_at=scan_resp.created_at,
        updated_at=scan_resp.updated_at,
    )

    try:
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except Exception as e:
        db.rollback()
        logger.error(f"Database transaction failure while saving scan {scan_resp.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database persistence failed",
        )


def get_scan_record_by_id(
    db: Session, scan_id: uuid.UUID, user_id: uuid.UUID
) -> Optional[ScanRecord]:
    """Retrieve an individual scan record strictly filtered by owner ID."""
    return (
        db.query(ScanRecord)
        .filter(ScanRecord.id == scan_id, ScanRecord.user_id == user_id)
        .first()
    )


def list_scan_records(
    db: Session,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 10,
    target_type: Optional[str] = None,
    verdict: Optional[str] = None,
) -> Tuple[List[ScanRecord], int]:
    """Retrieve paginated scan records strictly filtered by owner ID."""
    query = db.query(ScanRecord).filter(ScanRecord.user_id == user_id)

    if target_type:
        query = query.filter(ScanRecord.target_type == target_type)
    if verdict:
        query = query.filter(ScanRecord.verdict == verdict)

    total = query.with_entities(func.count(ScanRecord.id)).scalar() or 0

    records = (
        query.order_by(ScanRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return records, total


def delete_scan_record(db: Session, scan_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """Delete a scan record strictly filtered by owner ID."""
    record = (
        db.query(ScanRecord)
        .filter(ScanRecord.id == scan_id, ScanRecord.user_id == user_id)
        .first()
    )
    if not record:
        return False

    try:
        db.delete(record)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Database transaction failure while deleting scan {scan_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database deletion failed",
        )
