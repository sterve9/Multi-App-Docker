import os
import re
import json
import anthropic
from dotenv import load_dotenv

from app.schemas.contact import ContactRequest

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


def extract_json(text: str) -> dict:
    text = text.replace("```json", "").replace("```", "").strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("JSON non trouvé")
    return json.loads(match.group())


async def analyze_with_claude(contact: ContactRequest) -> dict:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY manquante")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""
Analyse ce lead B2B et retourne UNIQUEMENT un JSON strict :

{{
  "category": "automation|website|ai|consulting|ecommerce|other",
  "priority": "low|medium|high",
  "priority_score": 1-10,
  "summary": "résumé court",
  "next_action": "action recommandée"
}}

Nom : {contact.name}
Email : {contact.email}
Message : {contact.message}
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = message.content[0].text
        analysis = extract_json(raw)
        analysis["priority_score"] = int(analysis.get("priority_score", 5))
        return analysis

    except Exception as e:
        print("❌ Claude error:", e)
        return {
            "category": "other",
            "priority": "medium",
            "priority_score": 5,
            "summary": "Erreur analyse",
            "next_action": "manual_review"
        }
