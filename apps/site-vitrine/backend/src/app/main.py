print("🔥 MAIN FILE CHARGÉ 🔥")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import logging

from app.core.database import Base, engine
from app.models.lead import Lead
from app.api.routes.contact import router as contact_router

logger = logging.getLogger(__name__)


def wait_for_db(retries=20, delay=3):
    from sqlalchemy import text
    for attempt in range(retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ Base de données accessible.")
            engine.dispose()  # Vide le pool, repart propre
            return True
        except Exception as e:
            logger.warning(f"DB pas encore prête (tentative {attempt + 1}/{retries}) : {e}")
            engine.dispose()
            time.sleep(delay)
    # ← PAS de raise — on laisse l'app démarrer, pool_pre_ping gère la suite
    logger.error("⚠️ DB inaccessible après tous les retries — démarrage quand même")
    return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔄 Initialisation de la base de données...")
    db_ready = wait_for_db()
    if db_ready:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables créées/vérifiées avec succès!")
    else:
        print("⚠️ Démarrage sans initialisation DB — les tables seront créées à la première connexion réussie")
    yield


app = FastAPI(
    title="Site Vitrine API",
    version="1.0.0",
    description="Backend intelligent – Leads + DB + n8n",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vitrine.sterveshop.cloud",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contact_router, prefix="/api")


@app.get("/")
def root():
    return {"success": True, "message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


print("📌 ROUTES ENREGISTRÉES :")
for route in app.routes:
    print(route.path)