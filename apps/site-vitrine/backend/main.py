from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ContactRequest
import os
from dotenv import load_dotenv
import anthropic
import json

# ---------------------------------------------
# Chargement des variables d'environnement
# ---------------------------------------------
load_dotenv()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# ---------------------------------------------
# Initialisation FastAPI
# ---------------------------------------------
app = FastAPI(
    title="Site Vitrine API",
    version="0.1.0",
    description="Backend intelligent avec Claude + n8n"
)

# ---------------------------------------------
# Middleware CORS (frontend → backend)
# ---------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ à restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------
# Routes de base
# ---------------------------------------------
@app.get("/")
def root():
    return {"success": True, "message": "API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# ---------------------------------------------
# FONCTION : Analyse avec Claude (JSON strict)
# ---------------------------------------------
async def analyze_with_claude(contact: ContactRequest):
    """
    Analyse le message client et renvoie un JSON strict
    exploitable par n8n.
    """
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("Clé API Claude manquante")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # Prompt strict (contrat JSON)
    prompt = f"""
Tu es un moteur backend de classification de demandes clients.

Tu dois répondre UNIQUEMENT avec un JSON valide
respectant EXACTEMENT ce schéma :

{{
  "category": "automation | website | ai | consulting | unknown",
  "intent": "string",
  "tools": ["string"],
  "priority": "low | medium | high",
  "summary": "string"
}}

Règles strictes :
- Aucun texte en dehors du JSON
- Aucun markdown
- Aucune explication
- Si une information est incertaine, utilise "unknown"

Message client :
Nom : {contact.name}
Email : {contact.email}
Message : {contact.message}
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Claude renvoie du texte → on parse le JSON
        raw_text = message.content[0].text
        parsed_json = json.loads(raw_text)

        return parsed_json

    except json.JSONDecodeError:
        print("❌ JSON invalide renvoyé par Claude :", raw_text)
        raise RuntimeError("Réponse Claude non conforme au JSON attendu")

    except Exception as e:
        print("❌ Erreur Claude :", str(e))
        raise RuntimeError(f"Claude API error: {str(e)}")

# ---------------------------------------------
# ROUTE PRINCIPALE : /api/contact
# ---------------------------------------------
@app.post("/api/contact")
async def receive_contact(contact: ContactRequest):
    """
    Reçoit le formulaire frontend,
    analyse avec Claude,
    renvoie un JSON structuré.
    """
    try:
        analysis = await analyze_with_claude(contact)

        return {
            "success": True,
            "client": {
                "name": contact.name,
                "email": contact.email
            },
            "analysis": analysis
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------
# DEBUG ENV
# ---------------------------------------------
@app.get("/debug/env")
def debug_env():
    return {
        "anthropic_api_key_loaded": bool(ANTHROPIC_API_KEY),
        "key_prefix": ANTHROPIC_API_KEY[:10] + "..." if ANTHROPIC_API_KEY else None
    }
