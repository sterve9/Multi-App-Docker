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

    prompt = f"""Tu es un expert en publicité Facebook vidéo pour la vitalité masculine naturelle. Tu crées des vidéos-pub courtes et percutantes axées produit pour le Rituel Ancestral (miel, gingembre, cannelle, citron).

Génère une vidéo pub Facebook sur ce thème : "{theme}"
Format : {format} | Durée cible : {duration} secondes

STRUCTURE OBLIGATOIRE DE LA VIDÉO (3 phases) :
1. HOOK (2-3 sec max) — phrase choc qui arrête le scroll, question ou affirmation provocatrice
2. PRODUIT (présentation directe) — nomme le Rituel Ancestral, les 4 ingrédients, 5 min par matin
3. PROBLÈME → SOLUTION — le problème (fatigue, vitalité, brouillard mental) puis la solution concrète avec résultats

CONTRAINTE ABSOLUE SUR LA LONGUEUR DU SCRIPT :
- Le script voix off doit faire EXACTEMENT entre {words} mots.
- Pas un mot de plus. Compte les mots avant de répondre.
- ElevenLabs lit à 2.5 mots/seconde : si tu dépasses, la vidéo sera trop longue.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{{
  "hook": "La phrase choc d'ouverture (max 8 mots, stoppe le scroll Facebook)",
  "script": "Le script complet voix off en 3 phases HOOK→PRODUIT→PROBLÈME/SOLUTION ({words} mots MAX, ton direct, urgent, percutant, utilise 'tu')",
  "captions": {json.dumps([f"Caption courte {i+1}" for i in range(nb_captions)])},
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "description": "Accroche Facebook courte (100 caractères max, emojis, ton direct)",
  "sales_text": "Texte de vente complet Facebook prêt à copier-coller (4-6 lignes max) : commence par le hook, problème empathique, solution produit, résultats concrets dès J3, call-to-action avec ce lien exact : https://rituel.sterveshop.cloud — inclus 3-4 hashtags Facebook à la fin",
  "word_count": 0
}}

Règles absolues :
- Utilise "tu" jamais "vous"
- Phrases courtes, 1 idée par phrase
- Le produit = Rituel Ancestral, 4 ingrédients naturels, 5 min chaque matin
- Cible : homme francophone 25-50 ans, fatigué, vitalité en baisse
- Le sales_text doit se terminer par le lien https://rituel.sterveshop.cloud

Les captions sont les sous-titres à l'écran ({nb_captions} captions, 5-7 mots max chacune).
Dans "word_count", mets le nombre exact de mots du script."""

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