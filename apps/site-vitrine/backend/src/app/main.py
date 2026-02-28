print("🔥 MAIN FILE CHARGÉ 🔥")

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import os

from app.core.database import SessionLocal, Base, engine  # ✅ AJOUT: Base, engine
from app.models.lead import Lead  # ✅ AJOUT: Import du modèle
from app.schemas.contact import ContactRequest
from app.services.lead_service import create_lead
from app.services.n8n_service import trigger_n8n_webhook

# ✅ AJOUT ROUTER
from app.api.routes.contact import router as contact_router


# =====================================================
# APP
# =====================================================

app = FastAPI(
    title="Site Vitrine API",
    version="1.0.0",
    description="Backend intelligent – Leads + DB + n8n"
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

# =====================================================
# ✅ CRÉATION DES TABLES AU DÉMARRAGE
# =====================================================

@app.on_event("startup")
async def startup_event():
    """Crée les tables dans la base de données au démarrage"""
    print("🔄 Initialisation de la base de données...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables créées/vérifiées avec succès!")

# =====================================================
# DATABASE DEPENDENCY
# =====================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =====================================================
# ROUTES SYSTEM
# =====================================================

# ✅ Activation du router
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