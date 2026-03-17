import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, engine, wait_for_db
from app.models.post import Post
from app.api.routes import posts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_MIGRATIONS = [
    # Idempotent — ajoute les colonnes si elles n'existent pas encore
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS hook TEXT",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS reflection TEXT",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_filename VARCHAR(255)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS error_message TEXT",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS linkedin_post_id VARCHAR(255)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initialisation de la base de données...")
    wait_for_db()
    # Drop anciens types/tables incompatibles si nécessaire
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS posts CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS linkedin_posts CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS poststatus CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS posttype CASCADE"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for sql in _MIGRATIONS:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
        conn.commit()
    logger.info("Base de données prête ✅")
    yield
    logger.info("Arrêt propre")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts.router, prefix="/api")


@app.get("/")
def root():
    return {"app": settings.APP_NAME, "version": settings.VERSION, "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
