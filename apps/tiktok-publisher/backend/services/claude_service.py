import anthropic
from core.config import settings

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

# Durées cibles en secondes → débit de parole estimé (~130 mots/min)
DURATION_WORD_COUNT = {
    60: 130,
    90: 195,
    120: 260,
}

SYSTEM_PROMPT = """Tu es un expert en personal branding TikTok spécialisé dans l'IA et les business en ligne.
Tu rédiges des scripts vidéo pour un créateur de contenu francophone qui aide son audience à utiliser l'intelligence artificielle pour créer des business rentables, même sans expérience.

Règles absolues :
- Commence TOUJOURS par un hook ultra-accrocheur (première phrase = arrêter le scroll)
- Ton direct, personnel, parle en "tu" à l'audience
- Langage simple, concret, accessible — zéro jargon technique
- Des étapes actionnables, pas du blabla théorique
- Termine par un CTA clair (like, abonnement, commentaire ou question pour engager)
- N'écris PAS de didascalies, de titres, ni d'annotations — uniquement le texte parlé"""


async def generate_script(topic: str, duration_seconds: int) -> str:
    word_count = DURATION_WORD_COUNT.get(duration_seconds, int(duration_seconds * 2.2))

    message = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Rédige un script TikTok de {duration_seconds} secondes (~{word_count} mots) sur : {topic}\n\n"
                    f"Structure :\n"
                    f"1. Hook (3-5 secondes) — phrase choc qui stoppe le scroll\n"
                    f"2. Développement — conseil/astuce actionnable sur l'IA business\n"
                    f"3. CTA final (5 secondes) — engagement ou passage à l'action\n\n"
                    f"Retourne uniquement le texte parlé, sans aucune mise en forme."
                ),
            }
        ],
    )

    return message.content[0].text
