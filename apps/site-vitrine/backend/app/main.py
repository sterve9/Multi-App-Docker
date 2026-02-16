print("🔥 MAIN FILE CHARGÉ 🔥")

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import os

from app.core.database import SessionLocal
from app.schemas.contact import ContactRequest
from app.services.claude import analyze_with_claude
from app.services.lead_service import create_lead
from app.services.n8n import trigger_n8n_webhook

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
