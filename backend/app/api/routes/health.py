from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
async def health_check():
    """Health check endpoint to verify that the backend API is running."""
    return {
        "status": "ok",
        "message": "Siftrix API is running",
    }
