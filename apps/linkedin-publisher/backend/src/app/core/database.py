"""
Configuration de la base de données PostgreSQL
SQLAlchemy engine, session et base declarative
"""
import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

# Engine PostgreSQL — pas de connexion immédiate
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    echo=settings.DEBUG
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base pour les modèles
Base = declarative_base()


def wait_for_db(retries: int = 10, delay: float = 2.0):
    """Attend que la DB soit accessible avant de continuer."""
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Base de données accessible.")
            return
        except Exception as e:
            logger.warning(f"DB pas encore prête (tentative {attempt}/{retries}) : {e}")
            if attempt < retries:
                time.sleep(delay)
    raise RuntimeError("Impossible de se connecter à la base de données après plusieurs tentatives.")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()