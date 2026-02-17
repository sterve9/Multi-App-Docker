import json
import re
import os
from dotenv import load_dotenv
import anthropic

from app.schemas.analysis import LeadAnalysis

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


class ClaudeService:
    """
    Service responsable UNIQUEMENT de l'analyse IA.
    """

    def __init__(self):
        if not ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY manquante")

        self.client = anthropic.Anthropic(
            api_key=ANTHROPIC_API_KEY
        )

    def _extract_json(self, text: str) -> dict:
        """
        Nettoie la réponse Claude et extrait le JSON strict
        """
        text = text.strip()
        text = text.replace("```json", "").replace("```", "")

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("Aucun JSON valide trouvé dans la réponse IA")

        return json.loads(match.group())

    def analyze_contact(
        self,
        *,
        name: str,
        email: str,
        phone: str | None,
        subject: str | None,
        message: str
    ) -> LeadAnalysis:
        """
        Analyse un contact et retourne un LeadAnalysis VALIDÉ
        """

        prompt = f"""
Tu es un expert en qualification de leads B2B pour une agence d'automatisation.

Analyse la demande suivante et retourne UNIQUEMENT un JSON strict conforme
au schéma suivant :

{{
  "category": "automation|website|ai|consulting|ecommerce|other",
  "intent": "description courte",
  "priority": "low|medium|high",
  "priority_score": 1-10,
  "summary": "résumé synthétique",
  "next_action": "action commerciale recommandée"
}}

CLIENT :
Nom : {name}
Email : {email}
Téléphone : {phone or "Non fourni"}
Sujet : {subject or "Non fourni"}
Message : {message}

IMPORTANT :
- Réponds UNIQUEMENT avec le JSON
- Aucun texte avant ou après
"""

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )

        raw_text = response.content[0].text
        data = self._extract_json(raw_text)

        # 🔐 Validation forte via Pydantic
        return LeadAnalysis(**data)
