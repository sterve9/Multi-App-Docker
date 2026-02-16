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

@app.get("/")
def root():
    return {"success": True, "message": "API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# =====================================================
# ROUTE CONTACT
# =====================================================

@app.post("/api/contact")
async def receive_contact(
    contact: ContactRequest,
    db: Session = Depends(get_db)
):
    try:
        # 1️⃣ Analyse IA
        analysis = await analyze_with_claude(contact)

        # 2️⃣ Payload unifié
        payload = {
            "client": {
                "name": contact.name,
                "email": contact.email,
                "phone": contact.phone,
                "subject": contact.subject,
                "message": contact.message,
            },
            "analysis": analysis,
            "meta": {
                "source": "website",
                "received_at": datetime.utcnow().isoformat(),
            },
        }

        # 3️⃣ Sauvegarde DB
        lead = create_lead(db, payload)

        # 4️⃣ Webhook n8n (non bloquant)
        try:
            await trigger_n8n_webhook(payload)
            n8n_triggered = True
        except Exception as e:
            print("⚠️ n8n error:", e)
            n8n_triggered = False

        return {
            "success": True,
            "lead_id": lead.id,
            "priority": lead.priority,
            "n8n_triggered": n8n_triggered,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


print("📌 ROUTES ENREGISTRÉES :")
for route in app.routes:
    print(route.path)
