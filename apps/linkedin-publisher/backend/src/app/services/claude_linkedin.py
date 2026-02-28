"""
Service Claude pour améliorer et structurer les posts LinkedIn
"""
import json
import logging
import asyncio
import anthropic
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [5, 15, 30]


class ClaudeLinkedInService:
    """Service d'amélioration de posts LinkedIn avec Claude"""

    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY manquante")
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def improve_post(
        self,
        raw_content: str,
        post_type: str,
        user_name: str = "Utilisateur"
    ) -> dict:
        """
        Améliore un post LinkedIn brut avec retry 3x
        Returns:
            {
                "content": "Post amélioré...",
                "title": "Titre court",
                "image_prompt": "Prompt pour l'image..."
            }
        """
        if post_type == "learning":
            cta = "- Termine OBLIGATOIREMENT le post avec ce bloc lead magnet (adapte le MOT_CLÉ au sujet du post) :\n  '💬 Commente [MOT_CLÉ] + suis mon profil → je t'envoie le PDF complet gratuitement'"
        else:
            cta = "- Termine par une question engageante ou un CTA léger"

        prompt = f"""Tu es un expert LinkedIn qui aide les professionnels à créer du contenu authentique et engageant.
Contexte utilisateur : {user_name}
Type de post : {post_type}
Contenu brut : {raw_content}

TÂCHE 1 - Améliorer le post :
- Corrige les erreurs d'orthographe/grammaire
- Structure avec des sauts de ligne clairs
- Ajoute 2-3 emojis pertinents maximum
{cta}
- Garde le ton authentique de l'auteur
- Maximum 1300 caractères
- N'utilise PAS de tirets cadratin (—), utilise des tirets normaux (-)
- Pas de markdown (pas de **gras**)

TÂCHE 2 - Créer un titre court :
- Maximum 5-6 mots
- Doit résumer l'idée principale

TÂCHE 3 - Générer un prompt d'image :
- Image photo-réaliste professionnelle
- Représente bien le contenu du post
- Couleurs corporate : bleu et noir
- Style moderne et professionnel

FORMAT DE SORTIE (JSON strict) :
{{
  "content": "...",
  "title": "...",
  "image_prompt": "..."
}}
IMPORTANT : Réponds UNIQUEMENT avec le JSON, rien d'autre, pas de markdown."""

        last_exception = None

        for attempt in range(MAX_RETRIES):
            try:
                if attempt > 0:
                    delay = RETRY_DELAYS[attempt - 1]
                    logger.info(f"Claude improve_post — retry {attempt}/{MAX_RETRIES - 1} dans {delay}s...")
                    await asyncio.sleep(delay)

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        model="claude-sonnet-4-5",
                        max_tokens=1500,
                        messages=[{"role": "user", "content": prompt}]
                    )
                )

                raw_text = response.content[0].text.strip()
                raw_text = raw_text.replace("```json", "").replace("```", "").strip()

                result = json.loads(raw_text)
                logger.info(f"Claude improve_post ✅ (tentative {attempt + 1})")
                return result

            except json.JSONDecodeError as e:
                last_exception = e
                logger.warning(f"Claude improve_post — JSON invalide tentative {attempt + 1}: {e}")
            except Exception as e:
                last_exception = e
                logger.warning(f"Claude improve_post — erreur tentative {attempt + 1}: {e}")

        logger.error(f"Claude improve_post — échec après {MAX_RETRIES} tentatives")
        raise Exception(f"Claude improve_post échoué après {MAX_RETRIES} tentatives : {last_exception}")

    async def generate_bullets(self, content: str) -> List[str]:
        """
        Génère 3 bullets résumant le post avec retry 3x
        Returns:
            List[str]: Liste de 3 bullet points
        """
        prompt = f"""Voici un post LinkedIn :
{content}

TÂCHE : Crée 3 bullet points qui résument les points clés du post.
CONTRAINTES :
- Chaque bullet : maximum 7-8 mots
- Courts et percutants
- Représentent bien le message principal

FORMAT DE SORTIE (JSON strict) :
{{
  "bullets": ["...", "...", "..."]
}}
IMPORTANT : Réponds UNIQUEMENT avec le JSON, rien d'autre."""

        last_exception = None

        for attempt in range(MAX_RETRIES):
            try:
                if attempt > 0:
                    delay = RETRY_DELAYS[attempt - 1]
                    logger.info(f"Claude generate_bullets — retry {attempt}/{MAX_RETRIES - 1} dans {delay}s...")
                    await asyncio.sleep(delay)

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        model="claude-sonnet-4-5",
                        max_tokens=500,
                        messages=[{"role": "user", "content": prompt}]
                    )
                )

                raw_text = response.content[0].text.strip()
                raw_text = raw_text.replace("```json", "").replace("```", "").strip()
                result = json.loads(raw_text)
                logger.info(f"Claude generate_bullets ✅ (tentative {attempt + 1})")
                return result["bullets"]

            except (json.JSONDecodeError, KeyError) as e:
                last_exception = e
                logger.warning(f"Claude generate_bullets — JSON invalide tentative {attempt + 1}: {e}")
            except Exception as e:
                last_exception = e
                logger.warning(f"Claude generate_bullets — erreur tentative {attempt + 1}: {e}")

        logger.error(f"Claude generate_bullets — échec après {MAX_RETRIES} tentatives")
        raise Exception(f"Claude generate_bullets échoué après {MAX_RETRIES} tentatives : {last_exception}")