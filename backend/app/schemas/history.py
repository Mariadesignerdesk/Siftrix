import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.schemas.common import TargetType, Verdict, RiskLevel, BilingualText
from app.schemas.scan import ScanResponse


class ScanHistoryItem(BaseModel):
    """Lightweight item for scan history list and card rendering on the frontend."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    target_type: TargetType
    target_content: str = Field(..., description="Full content stored in DB; excluded from card preview if needed")
    overall_risk_score: float
    verdict: Verdict
    risk_level: RiskLevel
    summary: Optional[BilingualText] = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def target_content_preview(self) -> str:
        """Dynamically generated preview for UI cards (not stored as a DB column)."""
        max_length = 100
        clean_text = " ".join(self.target_content.split())
        if len(clean_text) <= max_length:
            return clean_text
        return clean_text[:max_length].rstrip() + "..."


class ScanHistoryListResponse(BaseModel):
    """Standard paginated history response for the frontend."""
    items: List[ScanHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


# Full detail view uses the unified ScanResponse
ScanDetailResponse = ScanResponse
