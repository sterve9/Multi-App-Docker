print("🔥 MAIN FILE CHARGÉ 🔥")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler  # ✅ AJOUTÉ
from slowapi.util import get_remote_address                # ✅ AJOUTÉ
from slowapi.errors import RateLimitExceeded               # ✅ AJOUTÉ
import time
import logging

from app.core.database import Base, engine
from app.api.routes import auth
from app.api.routes.admin import router as admin_router
from app.api.routes.blog import router as blog_router
from app import models
from app.api.routes.contact import router as contact_router

logger = logging.getLogger(__name__)

# =========================
# ✅ RATE LIMITER INIT
# =========================

# Identifie les utilisateurs par leur IP
limiter = Limiter(key_func=get_remote_address)


# =========================
# DATABASE WAIT LOGIC
# =========================

def wait_for_db(retries=20, delay=3):
    from sqlalchemy import text
    for attempt in range(retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ Base de données accessible.")
            engine.dispose()
            return True
        except Exception as e:
            logger.warning(f"DB pas encore prête (tentative {attempt + 1}/{retries}) : {e}")
            engine.dispose()
            time.sleep(delay)

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


# =========================
# FASTAPI INIT
# =========================

app = FastAPI(
    title="Site Vitrine API",
    version="1.0.0",
    description="Backend intelligent – Leads + Auth + Admin + Blog",
    lifespan=lifespan
)

# ✅ AJOUTÉ : attacher le limiter à l'app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# =========================
# MIDDLEWARE
# =========================

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


# =========================
# ROUTES
# =========================

# 🔹 Route publique contact
app.include_router(contact_router, prefix="/api")

# 🔹 Authentification
app.include_router(auth.router)

# 🔹 Route ADMIN protégée
app.include_router(admin_router)

# 🔹 Route BLOG (CRUD SaaS)
app.include_router(blog_router)


# =========================
# ENDPOINTS SYSTÈME
# =========================

@app.get("/")
def root():
    return {"success": True, "message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


print("📌 ROUTES ENREGISTRÉES :")
for route in app.routes:
    print(route.path)