import anthropic
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


async def generate_content(topic: str) -> dict:
    """
    Génère via Claude :
    - hook      : accroche Instagram/LinkedIn percutante
    - reflection: réflexion professionnelle sur l'IA (3-5 lignes)
    - image_prompt : prompt détaillé pour nano-banana-pro (9:16, référence photo)
    - processed_content : texte final formaté pour LinkedIn
    """

    prompt = f"""Tu es un expert en personal branding et en intelligence artificielle.
Tu crées du contenu viral pour un expert IA sur Instagram et LinkedIn.

SUJET : "{topic}"

Génère un post complet. Réponds UNIQUEMENT en JSON strict, sans texte avant ou après :

{{
  "hook": "Une accroche de max 15 mots, percutante, qui donne envie de lire la suite. Style viral Instagram. Commence par une émotion, un chiffre, ou une affirmation provocante.",
  "reflection": "3 à 5 lignes de réflexion professionnelle sur l'IA en rapport avec le sujet. Style inspirant, intelligent, accessible. Chaque phrase doit apporter de la valeur. Pas de bullet points, texte fluide.",
  "image_prompt": "Photorealistic portrait of a professional Black African man in his early 30s, athletic build, dark skin, short neat beard, confident intense gaze, [specific professional scene strongly related to the topic], dramatic cinematic lighting, ultra sharp, premium quality, aspirational and powerful atmosphere, 9:16 vertical format, LinkedIn thought leader style.",
  "processed_content": "Le texte complet formaté pour LinkedIn : hook en première ligne (accroche seule), saut de ligne, reflection, saut de ligne, hashtags pertinents (5-7 hashtags IA et business). Longueur idéale : 150-250 mots."
}}"""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    response = message.content[0].text
    cleaned  = response.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)
