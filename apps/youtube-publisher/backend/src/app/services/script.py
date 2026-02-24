import json
import anthropic
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

async def generate_script(topic: str, style: str = "cinematique") -> dict:
    prompt = f"""Tu es un scénariste expert en histoires vraies pour YouTube francophone.
    
Crée un script complet pour une vidéo de 5-7 minutes sur ce sujet : "{topic}"

Le script doit avoir exactement 15 scènes de ~20 secondes chacune.

Réponds UNIQUEMENT en JSON strict :
{{
  "title": "Titre accrocheur pour YouTube (max 70 chars)",
  "description": "Description YouTube de 150 mots avec les mots clés",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "scenes": [
    {{
      "scene_number": 1,
      "narration": "Texte de narration spoken word pour cette scène (2-3 phrases)",
      "image_prompt": "Prompt en anglais pour générer l'image de cette scène, style {style}, cinematic, dramatic lighting, 16:9",
      "duration_seconds": 20
    }}
  ]
}}"""

    message = client.messages.create(
        model="claude-opus-4-20250514",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    response = message.content[0].text
    cleaned = response.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)
