import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def generate_script(theme: str, format: str, duration: str) -> dict:
    """Génère script + captions + tags + description via Claude"""

    # ElevenLabs lit ~2.5 mots/seconde en voix naturelle francophone
    # On cible légèrement en dessous pour garder une marge de respiration
    duration_config = {
        "15": {"words": "35-40",   "captions": 3},
        "30": {"words": "70-80",   "captions": 5},
        "60": {"words": "140-150", "captions": 7},
    }
    config = duration_config.get(duration, {"words": "70-80", "captions": 5})
    words = config["words"]
    nb_captions = config["captions"]

    prompt = f"""Tu es un expert en contenu TikTok viral francophone sur la vitalité masculine et les remèdes naturels ancestraux.

Génère un contenu TikTok complet sur ce thème : "{theme}"
Format : {format} | Durée cible : {duration} secondes

CONTRAINTE ABSOLUE SUR LA LONGUEUR DU SCRIPT :
- Le script voix off doit faire EXACTEMENT entre {words} mots.
- Pas un mot de plus. Compte les mots avant de répondre.
- ElevenLabs lit à 2.5 mots/seconde : si tu dépasses, la vidéo sera trop longue.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{{
  "hook": "La première phrase accrocheuse (max 8 mots, doit stopper le scroll)",
  "script": "Le script complet voix off ({words} mots MAXIMUM, ton direct, intime, percutant)",
  "captions": {json.dumps([f"Caption courte {i+1}" for i in range(nb_captions)])},
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8"],
  "description": "Description TikTok optimisée SEO (150 caractères max avec emojis)",
  "word_count": 0
}}

Règles du script :
- Commence TOUJOURS par le hook (inclus dans le script)
- Utilise "tu" pas "vous"
- 1 idée par phrase, phrases très courtes
- Termine par un call-to-action vers le lien en bio
- Adapté à un homme francophone 25-50 ans, fatigué, qui cherche des solutions naturelles

Les captions sont les sous-titres clés qui apparaîtront à l'écran ({nb_captions} captions, 5-7 mots max chacune).

Dans le champ "word_count", mets le nombre exact de mots de ton script."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()

    # Nettoyer si markdown
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    result = json.loads(raw)

    # Vérification de sécurité côté backend
    script_words = len(result.get("script", "").split())
    max_words = int(words.split("-")[1])  # ex: "35-40" → 40

    # Si Claude a quand même dépassé, on tronque proprement à la dernière phrase complète
    if script_words > max_words + 5:
        sentences = result["script"].replace(".", ".|").replace("!", "!|").replace("?", "?|").split("|")
        truncated = ""
        count = 0
        for sentence in sentences:
            sentence_words = len(sentence.split())
            if count + sentence_words <= max_words:
                truncated += sentence
                count += sentence_words
            else:
                break
        result["script"] = truncated.strip()

    return result