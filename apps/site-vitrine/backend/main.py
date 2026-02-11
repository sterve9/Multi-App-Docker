from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ContactRequest
import os
from dotenv import load_dotenv
import anthropic
import json

# 🔹 NOUVEL IMPORT : service webhook n8n
from services.n8n_webhook import trigger_n8n_webhook
from datetime import datetime

load_dotenv()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

app = FastAPI(
    title="Site Vitrine API",
    version="0.1.0",
    description="Backend intelligent avec Claude + n8n"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vitrine.sterveshop.cloud",  # Frontend production
        "http://localhost:5500",              # Dev local
        "http://127.0.0.1:5500",              # Dev local
        "http://localhost:8000",              # Backend local
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"success": True, "message": "API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

def extract_json_from_text(text: str) -> dict:
    """Extrait le JSON même si entouré de markdown"""
    text = text.strip()
    
    # Supprimer backticks
    text = text.replace("```json", "").replace("```", "")
    
    # Trouver le JSON
    start = text.find("{")
    end = text.rfind("}") + 1
    
    if start == -1 or end == 0:
        raise ValueError("Aucun JSON trouvé")
    
    json_str = text[start:end]
    return json.loads(json_str)

async def analyze_with_claude(contact: ContactRequest):
    """Analyse avec Claude - JSON strict"""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("Clé API Claude manquante")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans backticks.

Schéma JSON :
{{
  "category": "automation | website | ai | consulting | unknown",
  "intent": "string",
  "tools": ["string"],
  "priority": "low | medium | high",
  "summary": "string"
}}

Message client :
Nom : {contact.name}
Email : {contact.email}
Message : {contact.message}

Réponds UNIQUEMENT avec le JSON."""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        raw_text = message.content[0].text.strip()
        
        # Debug
        print("🔍 Claude a renvoyé :")
        print(raw_text)
        print("=" * 50)
        
        # Parser avec fonction robuste
        parsed_json = extract_json_from_text(raw_text)
        
        # Valider
        required_keys = ["category", "intent", "tools", "priority", "summary"]
        for key in required_keys:
            if key not in parsed_json:
                raise ValueError(f"Clé manquante : {key}")
        
        return parsed_json

    except (json.JSONDecodeError, ValueError) as e:
        print("❌ Erreur parsing JSON :")
        print(f"Texte reçu : {raw_text}")
        print(f"Erreur : {str(e)}")
        raise RuntimeError(f"Réponse Claude non conforme : {str(e)}")

    except Exception as e:
        print("❌ Erreur Claude :", str(e))
        raise RuntimeError(f"Claude API error: {str(e)}")


# 🔹 MODIFICATION : route /api/contact pour déclencher le workflow n8n
@app.post("/api/contact")
async def receive_contact(contact: ContactRequest):
    """
    Reçoit le formulaire de contact,
    analyse avec Claude,
    et déclenche un workflow n8n via webhook
    """
    try:
        # 1️⃣ Analyse avec Claude
        analysis = await analyze_with_claude(contact)

        # 2️⃣ Préparer les données pour n8n
        webhook_data = {
            "client": {
                "name": contact.name,
                "email": contact.email,
                "message": contact.message
            },
            "analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }

        # 3️⃣ Déclencher le workflow n8n
        try:
            n8n_response = await trigger_n8n_webhook(webhook_data)
            n8n_triggered = True
        except Exception as e:
            # Si n8n échoue, on continue quand même
            print(f"⚠️ n8n webhook failed: {e}")
            n8n_triggered = False
            n8n_response = None

        # 4️⃣ Retourner la réponse complète
        return {
            "success": True,
            "client": {
                "name": contact.name,
                "email": contact.email
            },
            "analysis": analysis,
            "n8n_triggered": n8n_triggered
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/debug/env")
def debug_env():
    return {
        "anthropic_api_key_loaded": bool(ANTHROPIC_API_KEY),
        "key_prefix": ANTHROPIC_API_KEY[:10] + "..." if ANTHROPIC_API_KEY else None
    }
