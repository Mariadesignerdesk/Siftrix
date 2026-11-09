from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes.health import router as health_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered phishing and scam detection platform",
    version=settings.PROJECT_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes (health endpoint preserved at /api/health)
app.include_router(health_router)


@app.get("/")
async def root():
    """Root endpoint welcoming visitors."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}. Visit /api/health for status check.",
        "docs_url": "/docs",
    }
