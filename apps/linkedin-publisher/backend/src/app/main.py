"""
LinkedIn Publisher API - Main Application
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.models.user import User
from app.models.post import LinkedInPost
from app.api.routes import posts, images

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =====================================================
# LIFESPAN (remplace @on_event deprecated)
# =====================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initialisation de la base de données...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tables créées/vérifiées avec succès")
    yield
    # Shutdown
    logger.info("Application arrêtée proprement")


# =====================================================
# APPLICATION FASTAPI
# =====================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="API pour automatiser la publication de posts LinkedIn avec génération d'images IA",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)


# =====================================================
# CORS MIDDLEWARE
# =====================================================

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

if hasattr(settings, "ALLOWED_ORIGINS") and settings.ALLOWED_ORIGINS:
    allowed_origins.extend(settings.ALLOWED_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


# =====================================================
# ROUTES
# =====================================================

app.include_router(posts.router, prefix="/api")
app.include_router(images.router, prefix="/api")


# =====================================================
# ENDPOINTS DE BASE
# =====================================================

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(engine.dialect.has_table.__func__ and __import__('sqlalchemy').text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "unavailable"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status
    }
