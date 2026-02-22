"""
Service Claude pour améliorer et structurer les posts LinkedIn
"""
import json
import logging
import anthropic
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)


class ClaudeLinkedInService:
    """Service d'amélioration de posts LinkedIn avec Claude"""

    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY manquante")
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def improve_post(
        self,
        raw_content: str,
        post_type: str,
        user_name: str = "Utilisateur"
    ) -> dict:
        """
        Améliore un post LinkedIn brut

        Returns:
            {
                "content": "Post amélioré...",
                "title": "Titre court",
                "image_prompt": "Prompt pour l'image..."
            }
        """
        prompt = f"""Tu es un expert LinkedIn qui aide les professionnels à créer du contenu authentique et engageant.

Contexte utilisateur : {user_name}
Type de post : {post_type}
Contenu brut : {raw_content}

TÂCHE 1 - Améliorer le post :
- Corrige les erreurs d'orthographe/grammaire
- Structure avec des sauts de ligne clairs
- Ajoute 2-3 emojis pertinents maximum
- Termine par une question engageante ou un CTA léger
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

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )

        raw_text = response.content[0].text.strip()
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            raise ValueError(f"Claude n'a pas retourné un JSON valide: {raw_text[:200]}")

    def generate_bullets(self, content: str) -> List[str]:
        """
        Génère 3 bullets résumant le post

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

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        raw_text = response.content[0].text.strip()
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()

        try:
            result = json.loads(raw_text)
            return result["bullets"]
        except (json.JSONDecodeError, KeyError):
            raise ValueError("Claude n'a pas retourné un JSON valide pour les bullets")
