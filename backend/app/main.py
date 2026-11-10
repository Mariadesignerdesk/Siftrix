"""FastAPI application entrypoint for Siftrix backend API."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.api.routes.health import router as health_router
from app.api.routes.scans import router as scans_router
from app.api.routes.history import router as history_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context managing database table provisioning.

    - Development: verifies/creates database tables if PostgreSQL is available.
    - Production: database schema changes should be applied via Alembic migrations ('alembic upgrade head').
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(
            f"Database initialization deferred (PostgreSQL offline or lazy mode): {e}. "
            "In production, execute 'alembic upgrade head' to apply migrations."
        )
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered phishing and scam detection platform",
    version=settings.PROJECT_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-ID"],  # Required for frontend to read and persist the session token
)

# Register routes
app.include_router(health_router)
app.include_router(scans_router)
app.include_router(history_router)


@app.get("/")
async def root():
    """Root endpoint welcoming visitors."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}. Visit /api/health for status check.",
        "docs_url": "/docs",
    }
