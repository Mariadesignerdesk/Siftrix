"""SIFTRIX AI cybersecurity chat endpoint."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Response

from app.core.auth import get_optional_current_user, resolve_owner_id_for_scan
from app.models.user import User
from app.schemas.chat import ChatRequest
from app.services.gemini import gemini_client

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post("/chat")
async def chat_with_assistant(
    payload: ChatRequest,
    response: Response,
    current_user: Optional[User] = Depends(get_optional_current_user),
    owner_id: uuid.UUID = Depends(resolve_owner_id_for_scan),
):
    """Generate a cybersecurity assistant response."""

    if current_user is None:
        response.headers["X-Session-ID"] = str(owner_id)

    result = await gemini_client.chat(
        prompt=payload.prompt,
        history=[message.model_dump() for message in payload.history],
    )

    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": result["content"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "citations": [],
        "suggestedFollowUps": [
            "How can I identify a phishing message?",
            "How do I protect my online accounts?",
        ],
        "language": "en",
        "provider": result.get("provider"),
        "is_fallback": result.get("is_fallback", False),
    }