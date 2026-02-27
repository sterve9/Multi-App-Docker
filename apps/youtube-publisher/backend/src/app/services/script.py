import json
import anthropic
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

async def generate_script(topic: str, style: str = "cinematique") -> dict:
    prompt = f"""Tu es un scénariste expert en histoires vraies pour YouTube francophone.

Crée un script complet pour une vidéo de 7-10 minutes sur ce sujet : "{topic}"
Le script doit avoir exactement 18 scènes.

IMPORTANT : chaque narration doit être longue et détaillée — minimum 80 mots par scène (environ 5-6 phrases). 
Style storytelling immersif, comme un vrai narrateur YouTube qui tient son audience en haleine.
Plus la narration est riche et détaillée, mieux c'est pour le watch time YouTube.

Réponds UNIQUEMENT en JSON strict, sans texte avant ou après :
{{
  "title": "Titre accrocheur pour YouTube (max 70 chars)",
  "description": "Description YouTube de 150 mots avec les mots clés",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "scenes": [
    {{
      "scene_number": 1,
      "narration": "Texte de narration long et détaillé pour cette scène, minimum 80 mots, style storytelling immersif, 5-6 phrases captivantes qui donnent envie de continuer à regarder",
      "image_prompt": "Prompt en anglais pour générer l'image de cette scène, style {style}, cinematic, dramatic lighting, 16:9",
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