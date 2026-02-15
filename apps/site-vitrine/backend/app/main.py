print("🔥🔥🔥 MAIN FILE CHARGÉ 🔥🔥🔥")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
import re
import json

from dotenv import load_dotenv
import anthropic

# =========================
# Imports internes (NOUVELLE ARCHI)
# =========================
from app.schemas.contact import ContactRequest
from app.services.n8n import trigger_n8n_webhook
from app.core.database import engine
from app.models import lead  # IMPORTANT : déclenche la création de table

# =========================
# CONFIG
# =========================

load_dotenv()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

app = FastAPI(
    title="Site Vitrine API",
    version="0.3.0",
    description="Backend intelligent avec Claude + n8n + Database"
)

# =========================
# MIDDLEWARE CORS
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
# STARTUP EVENT (DATABASE)
# =========================

@app.on_event("startup")
def startup_db():
    print("🟢 Initialisation de la base de données...")
    lead.Base.metadata.create_all(bind=engine)
    print("✅ Tables prêtes")

# =========================
# ROUTES BASIQUES
# =========================

@app.get("/")
def root():
    return {"success": True, "message": "API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/debug/env")
def debug_env():
    return {
        "anthropic_api_key_loaded": bool(ANTHROPIC_API_KEY),
        "key_prefix": ANTHROPIC_API_KEY[:10] + "..." if ANTHROPIC_API_KEY else None
    }

# =========================
# OUTILS
# =========================

def extract_json_from_text(text: str) -> dict:
    """
    Nettoie et extrait un JSON valide depuis la réponse Claude
    """
    text = text.strip()
    text = text.replace("```json", "").replace("```", "")

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("Aucun JSON trouvé dans la réponse Claude")

    return json.loads(match.group())

# =========================
# ANALYSE CLAUDE
# =========================

async def analyze_with_claude(contact: ContactRequest) -> dict:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("Clé API Claude manquante")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""
Tu es un expert en qualification de leads B2B pour une agence d'automatisation.

Analyse cette demande et retourne UNIQUEMENT un JSON strict :

{{
  "category": "automation|website|ai|consulting|ecommerce|other",
  "intent": "description courte",
  "priority": "low|medium|high",
  "priority_score": 1-10,
  "tools": ["liste", "outils"],
  "summary": "résumé en une phrase",
  "next_action": "action commerciale recommandée"
}}

CLIENT :
Nom : {contact.name}
Email : {contact.email}
Téléphone : {contact.phone or "Non fourni"}
Sujet : {contact.subject or "Non fourni"}
Message : {contact.message}

Réponds uniquement avec le JSON.
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        raw_text = message.content[0].text.strip()
        print("🔍 Claude RAW:", raw_text)

        analysis = extract_json_from_text(raw_text)

        analysis["priority_score"] = int(analysis.get("priority_score", 5))
        return analysis

    except Exception as e:
        print("❌ Erreur analyse Claude:", e)
        return {
            "category": "other",
            "intent": "erreur_analyse",
            "priority": "medium",
            "priority_score": 5,
            "tools": [],
            "summary": f"Erreur analyse : {str(e)}",
            "next_action": "manual_review"
        }

# =========================
# ROUTE PRINCIPALE
# =========================

@app.post("/api/contact")
async def receive_contact(contact: ContactRequest):
    try:
        analysis = await analyze_with_claude(contact)

        webhook_data = {
            "client": {
                "name": contact.name,
                "email": contact.email,
                "phone": contact.phone,
                "subject": contact.subject,
                "message": contact.message,
            },
            "analysis": analysis,
            "timestamp": datetime.now().isoformat(),
        }

        try:
            await trigger_n8n_webhook(webhook_data)
            n8n_triggered = True
        except Exception as e:
            print("⚠️ n8n webhook error:", e)
            n8n_triggered = False

        return {
            "success": True,
            "analysis": analysis,
            "n8n_triggered": n8n_triggered,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# DEBUG ROUTES
# =========================

print("📌 ROUTES ENREGISTRÉES :")
for route in app.routes:
    print(route.path)
