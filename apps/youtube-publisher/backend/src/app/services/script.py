import json
import anthropic
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# ── Personnages fixes pour toute la chaîne ──────────────────────
CHARACTERS = {
    "homme": {
        "nom": "Kofi",
        "description": "homme africain de 35 ans, athlétique, peau noire profonde, regard intense, barbe courte soignée, visage expressif"
    },
    "femme": {
        "nom": "Ama",
        "description": "femme africaine de 32 ans, élégante, peau chocolat, cheveux naturels tressés, regard perçant, lèvres pleines"
    }
}

# ── Prompt de base pour les image_prompts (cohérence visuelle) ──
CHARACTER_VISUAL_BASE = (
    f"Kofi ({CHARACTERS['homme']['description']}) and "
    f"Ama ({CHARACTERS['femme']['description']}), "
    "photorealistic, cinematic lighting, African setting, "
    "dramatic shadows, emotional atmosphere, 16:9 aspect ratio"
)


async def generate_script(
    topic: str,
    style: str = "cinematique",
    episode_number: int = 1,
    previous_summary: str = None
) -> dict:

    # Construction du contexte de continuité
    continuity_context = ""
    if episode_number > 1 and previous_summary:
        continuity_context = f"""
CONTEXTE DE L'ÉPISODE PRÉCÉDENT (épisode {episode_number - 1}) :
{previous_summary}

Tu DOIS faire référence à ce qui s'est passé avant. L'histoire continue là où elle s'est arrêtée.
"""

    prompt = f"""Tu es un scénariste expert en histoires dramatiques de couple pour YouTube francophone Afrique.

PERSONNAGES FIXES (toujours les mêmes dans toute la série) :
- Kofi : {CHARACTERS['homme']['description']}
- Ama : {CHARACTERS['femme']['description']}

THÈME DE LA SÉRIE : Les secrets cachés dans un couple — comment le manque de virilité et d'énergie de l'homme détruit progressivement la relation amoureuse. Histoires intenses, émotionnelles, réalistes.

{continuity_context}

SUJET DE CET ÉPISODE {episode_number} : "{topic}"

Crée un script complet pour une vidéo de 2-3 minutes.
Le script doit avoir exactement 5 scènes.

RÈGLES IMPORTANTES :
1. Chaque narration : minimum 60 mots, style storytelling immersif, voix de narrateur omniscient
2. Les personnages s'appellent TOUJOURS Kofi et Ama
3. L'histoire doit être captivante, avec des rebondissements
4. Chaque épisode doit se terminer sur un cliffhanger ou une révélation
5. Intégrer subtilement le thème de la vitalité masculine et ses effets sur le couple
6. Les image_prompts doivent TOUJOURS décrire Kofi et Ama avec leurs caractéristiques physiques exactes

DESCRIPTION YOUTUBE : Doit inclure à la fin exactement ce texte :
"🔗 Le rituel naturel dont parle Kofi : {settings.AFFILIATE_LINK}"

Réponds UNIQUEMENT en JSON strict, sans texte avant ou après :
{{
  "title": "Titre accrocheur YouTube Épisode {episode_number} (max 70 chars, inclure 'Ep.{episode_number}')",
  "description": "Description YouTube 150 mots + lien produit à la fin",
  "episode_summary": "Résumé en 3 phrases de ce qui s'est passé dans cet épisode (pour la continuité)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "scenes": [
    {{
      "scene_number": 1,
      "narration": "Texte de narration long et détaillé, minimum 80 mots, style storytelling immersif",
      "image_prompt": "Kofi (homme africain 35 ans, athlétique, peau noire profonde, barbe courte) and Ama (femme africaine 32 ans, élégante, peau chocolat, cheveux naturels tressés), [description de la scène], photorealistic, cinematic lighting, dramatic shadows, 16:9",
      "duration_seconds": 30
    }}
  ]
}}"""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}]
    )

    response = message.content[0].text
    cleaned = response.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)