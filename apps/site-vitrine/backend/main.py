from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ContactRequest
import os
from dotenv import load_dotenv
import anthropic
import json

load_dotenv()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

app = FastAPI(
    title="Site Vitrine API",
    version="0.1.0",
    description="Backend intelligent avec Claude + n8n"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.post("/api/contact")
async def receive_contact(contact: ContactRequest):
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

@app.get("/debug/env")
def debug_env():
    return {
        "anthropic_api_key_loaded": bool(ANTHROPIC_API_KEY),
        "key_prefix": ANTHROPIC_API_KEY[:10] + "..." if ANTHROPIC_API_KEY else None
    }