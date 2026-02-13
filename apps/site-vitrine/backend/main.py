from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ContactRequest
import os
from dotenv import load_dotenv
import anthropic
import json

# 🔹 Service webhook n8n
from services.n8n_webhook import trigger_n8n_webhook
from datetime import datetime

load_dotenv()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

app = FastAPI(
    title="Site Vitrine API",
    version="0.2.0",
    description="Backend intelligent avec Claude + n8n (Lead Scoring System)"
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

@app.get("/")
def root():
    return {"success": True, "message": "API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}


def extract_json_from_text(text: str) -> dict:
    """Extrait le JSON même si entouré de markdown"""
    text = text.strip()
    text = text.replace("```json", "").replace("```", "")

    start = text.find("{")
    end = text.rfind("}") + 1

    if start == -1 or end == 0:
        raise ValueError("Aucun JSON trouvé")

    json_str = text[start:end]
    return json.loads(json_str)


async def analyze_with_claude(contact: ContactRequest):
    """Analyse avancée avec Claude - Lead Scoring JSON strict"""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("Clé API Claude manquante")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""
You are a business lead qualification assistant.

Respond ONLY with a valid JSON object. No text before or after. No backticks.

JSON structure:
{{
  "category": "devis | information | automation | autre",
  "priority_score": number between 0 and 10,
  "lead_temperature": "hot | warm | cold",
  "intent": "short_snake_case_intent",
  "budget_signal": "high | medium | low | unknown",
  "response_required": true,
  "suggested_action": "schedule_call | send_pricing | auto_reply",
  "summary": "short professional summary"
}}

Scoring rules:
- 8–10 = urgent project, clear business intent
- 5–7 = serious inquiry but missing urgency
- 0–4 = vague or low business impact

Temperature rules:
- hot if priority_score >= 8
- warm if 5–7
- cold if 0–4

Client message:
Name: {contact.name}
Email: {contact.email}
Phone: {contact.phone}
Message: {contact.message}

Return JSON only.
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        raw_text = message.content[0].text.strip()

        print("🔍 Claude response:")
        print(raw_text)
        print("=" * 50)

        parsed_json = extract_json_from_text(raw_text)

        required_keys = [
            "category",
            "priority_score",
            "lead_temperature",
            "intent",
            "budget_signal",
            "response_required",
            "suggested_action",
            "summary"
        ]

        for key in required_keys:
            if key not in parsed_json:
                raise ValueError(f"Clé manquante : {key}")

        return parsed_json

    except (json.JSONDecodeError, ValueError) as e:
        print("❌ JSON parsing error")
        print(f"Texte reçu : {raw_text}")
        print(f"Erreur : {str(e)}")
        raise RuntimeError(f"Réponse Claude non conforme : {str(e)}")

    except Exception as e:
        print("❌ Claude API error :", str(e))
        raise RuntimeError(f"Claude API error: {str(e)}")


@app.post("/api/contact")
async def receive_contact(contact: ContactRequest):
    """
    Reçoit le formulaire,
    analyse avec Claude,
    déclenche n8n
    """
    try:
        analysis = await analyze_with_claude(contact)

        webhook_data = {
            "client": {
                "name": contact.name,
                "email": contact.email,
                "phone": contact.phone,
                "message": contact.message
            },
            "analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }

        try:
            n8n_response = await trigger_n8n_webhook(webhook_data)
            n8n_triggered = True
        except Exception as e:
            print(f"⚠️ n8n webhook failed: {e}")
            n8n_triggered = False
            n8n_response = None

        return {
            "success": True,
            "client": {
                "name": contact.name,
                "email": contact.email,
                "phone": contact.phone
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
