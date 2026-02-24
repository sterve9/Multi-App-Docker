import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.routes import videos, generate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initialisation de la base de données...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tables créées/vérifiées avec succès")
    yield
    logger.info("Application arrêtée proprement")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(videos.router, prefix="/api")
app.include_router(generate.router, prefix="/api")

@app.get("/")
def root():
    return {"app": settings.APP_NAME, "version": settings.VERSION, "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}
