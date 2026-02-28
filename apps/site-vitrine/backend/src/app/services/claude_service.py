import json
import re
import logging
import asyncio
import anthropic
from app.schemas.analysis import LeadAnalysis
from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [5, 15, 30]


class ClaudeService:
    """Service Claude : analyse lead + génération email de réponse"""

    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY manquante")
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _extract_json(self, text: str) -> dict:
        text = text.strip().replace("```json", "").replace("```", "")
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("Aucun JSON valide trouvé dans la réponse IA")
        return json.loads(match.group())

    async def analyze_contact(
        self,
        *,
        name: str,
        email: str,
        phone: str | None,
        subject: str | None,
        message: str
    ) -> LeadAnalysis:
        """Analyse un contact et retourne un LeadAnalysis validé — retry 3x"""

        prompt = f"""Tu es un expert en qualification de leads B2B pour une agence d'automatisation.

Analyse la demande suivante et retourne UNIQUEMENT un JSON strict :

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

IMPORTANT : Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après."""

        last_exception = None
        for attempt in range(MAX_RETRIES):
            try:
                if attempt > 0:
                    delay = RETRY_DELAYS[attempt - 1]
                    logger.info(f"analyze_contact — retry {attempt}/{MAX_RETRIES - 1} dans {delay}s...")
                    await asyncio.sleep(delay)

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=800,
                        messages=[{"role": "user", "content": prompt}]
                    )
                )
                data = self._extract_json(response.content[0].text)
                logger.info(f"analyze_contact ✅ (tentative {attempt + 1})")
                return LeadAnalysis(**data)

            except Exception as e:
                last_exception = e
                logger.warning(f"analyze_contact — erreur tentative {attempt + 1}: {e}")

        raise Exception(f"analyze_contact échoué après {MAX_RETRIES} tentatives : {last_exception}")

    async def generate_email(
        self,
        *,
        name: str,
        email: str,
        message: str,
        category: str,
        intent: str,
        priority: str,
        summary: str,
        next_action: str,
    ) -> dict:
        """Génère l'email de réponse adapté à la priorité — retry 3x"""

        if priority == "high":
            strategy = "strategic_call"
            strategy_instructions = """- Ton direct et stratégique
- Mettre en avant l'impact business
- Proposer un appel clair (15-30 min)
- CTA assumé et orienté action"""
        elif priority == "medium":
            strategy = "consultative"
            strategy_instructions = """- Ton pédagogique
- Montrer compréhension du besoin
- Proposer un échange ou mini diagnostic
- CTA souple et professionnel"""
        else:
            strategy = "qualification"
            strategy_instructions = """- Ton exploratoire
- Poser une question pertinente
- Inviter à préciser le besoin
- CTA léger"""

        prompt = f"""Tu es un expert en relation client B2B.
Tu rédiges des emails professionnels, humains et stratégiques pour répondre à des leads entrants.
Tu ne dois jamais inventer d'informations. Tu utilises uniquement les données fournies.

CONTEXTE ENTREPRISE :
Nous aidons les entreprises à structurer, automatiser et optimiser leur acquisition via backend, IA et automatisation (n8n, agents IA, orchestration SaaS).
Signature : Sterve

CLIENT :
Nom : {name}
Email : {email}
Message : {message}
Catégorie : {category}
Intention : {intent}
Priorité : {priority}
Résumé : {summary}
Prochaine action suggérée : {next_action}

STRATÉGIE : {strategy}
{strategy_instructions}

FORMAT DE SORTIE (JSON strict) :
{{
  "subject": "Objet de l'email",
  "body": "Corps complet de l'email avec sauts de ligne via \\n"
}}
IMPORTANT : Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après, pas de markdown."""

        last_exception = None
        for attempt in range(MAX_RETRIES):
            try:
                if attempt > 0:
                    delay = RETRY_DELAYS[attempt - 1]
                    logger.info(f"generate_email — retry {attempt}/{MAX_RETRIES - 1} dans {delay}s...")
                    await asyncio.sleep(delay)

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=1000,
                        messages=[{"role": "user", "content": prompt}]
                    )
                )
                data = self._extract_json(response.content[0].text)
                logger.info(f"generate_email ✅ (tentative {attempt + 1})")
                return data

            except Exception as e:
                last_exception = e
                logger.warning(f"generate_email — erreur tentative {attempt + 1}: {e}")

        raise Exception(f"generate_email échoué après {MAX_RETRIES} tentatives : {last_exception}")