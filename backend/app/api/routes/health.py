"""Health check endpoint verifying API runtime and database connectivity."""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint reporting API runtime and database connectivity status."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.warning(f"Database health check query failed: {e}")
        db_status = "disconnected"

    return {
        "status": "ok",
        "message": "Siftrix API is running",
        "database": db_status,
    }
