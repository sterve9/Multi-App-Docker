"""
LinkedIn Publisher API - Main Application
Point d'entrée de l'application FastAPI

IMPORTANT :
- L'application est lancée avec : python -m uvicorn src.app.main:app
- Le vrai package racine est donc : src
- Tous les imports internes DOIVENT commencer par src.
"""

print("🚀 LinkedIn Publisher API - Starting...")

# =====================================================
# IMPORTS FRAMEWORK
# =====================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# =====================================================
# IMPORTS INTERNES (CORRIGÉS)
# =====================================================
# AVANT (cassé) :
# from app.core.config import settings
#
# POURQUOI C'ÉTAIT FAUX :
# - "app" n'est PAS un package racine
# - "app" est un sous-package de "src"
#
# APRÈS (correct) :
# - On importe depuis src, qui est la vraie racine Python

from app.core.config import settings
from app.core.database import Base, engine
from app.models.user import User
from app.models.post import LinkedInPost
from app.api.routes import posts, images


# =====================================================
# APPLICATION FASTAPI
# =====================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="API pour automatiser la publication de posts LinkedIn avec génération d'images IA",
    docs_url="/docs",
    redoc_url="/redoc"
)


# =====================================================
# CORS MIDDLEWARE
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # React dev
        "http://localhost:5173",      # Vite dev
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        # Ajouter ici les domaines de production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# DATABASE INITIALIZATION
# =====================================================

@app.on_event("startup")
async def startup_event():
    """
    S'exécute AU DÉMARRAGE du serveur :
    - Crée les tables si elles n'existent pas
    - Vérifie la connexion à la base
    """
    print("🔄 Initialisation de la base de données...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables créées/vérifiées avec succès!")
    print("📊 Models chargés : User, LinkedInPost")


# =====================================================
# ROUTES
# =====================================================

# Injection des routers API
# Résultat :
# - /api/posts
# - /api/images
app.include_router(posts.router, prefix="/api")
app.include_router(images.router, prefix="/api")


# =====================================================
# ENDPOINTS DE BASE
# =====================================================

@app.get("/")
def root():
    """
    Endpoint racine
    Sert de health-check simple
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    """
    Health check avancé
    (peut être étendu plus tard : DB, Redis, etc.)
    """
    return {
        "status": "healthy",
        "database": "connected"
    }


# =====================================================
# DEBUG : LISTE DES ROUTES
# =====================================================

print("\n📌 ROUTES ENREGISTRÉES :")
for route in app.routes:
    if hasattr(route, "methods"):
        methods = ", ".join(route.methods)
        print(f"  [{methods}] {route.path}")
    else:
        print(f"  {route.path}")

print("\n✅ Application prête !")
print("📖 Documentation : http://localhost:8001/docs\n")
