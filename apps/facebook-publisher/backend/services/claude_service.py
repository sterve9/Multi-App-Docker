import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def generate_script(theme: str, format: str, duration: str) -> dict:
    """Génère script + captions + tags + description via Claude"""

    duration_config = {
        "15": {"words": "35-40",   "captions": 3},
        "30": {"words": "70-80",   "captions": 5},
        "60": {"words": "140-150", "captions": 7},
    }
    config = duration_config.get(duration, {"words": "70-80", "captions": 5})
    words = config["words"]
    nb_captions = config["captions"]

    prompt = f"""Tu es un expert en Reels Facebook pour la vitalité masculine naturelle.
Tu génères des scripts basés sur des données de performance réelles (rétention faible à 3-5s).

Thème : "{theme}" | Format : {format} | Durée : {duration} secondes

OBJECTIF CRITIQUE :
Empêcher le drop dans les 3 premières secondes.
Aller DIRECT au résultat ou à la transformation.

STRUCTURE OBLIGATOIRE DU REEL ({duration}s max) :

1. HOOK CHOC + PROMESSE [0-3s]
Le hook doit contenir :
- une douleur OU curiosité
- ET une transformation rapide ou résultat

Exemples :
"Ce mélange a changé mes nuits en 3 jours"
"Elle a remarqué en 3 jours grâce à ça"
"Ce remède ancien a tout changé"

⚠️ INTERDIT :
- phrases longues
- explication
- bénéfices vagues
- commencer par le nom du produit

2. SOLUTION IMMÉDIATE [3-6s]
Aller DIRECT à l’action ou visuel :
- montrer le mélange
- OU montrer le résultat
- OU réaction femme

AUCUNE phrase inutile
AUCUNE théorie

3. PREUVE / RÉSULTAT [6-20s]
Montrer un effet concret :
- "elle m’a regardé différemment"
- "elle me l’a dit elle-même"
- "en 3 jours j’ai vu la différence"

Phrases très courtes
1 idée = 1 phrase

4. DOUBLE CTA FINAL [20s+]
Toujours EXACTEMENT :
"Le lien est dans le premier commentaire."
"Écris 1, 2 ou 3 pour recevoir ton offre directement."

CONTRAINTE LONGUEUR :
- Script voix off : EXACTEMENT entre {words} mots
- Compte les mots avant de répondre

Réponds UNIQUEMENT en JSON valide :
{{
  "hook": "Hook choc avec promesse (max 8 mots)",
  "script": "Script complet {words} mots : HOOK → SOLUTION DIRECTE → PREUVE → DOUBLE CTA. Utilise 'tu'. Terminer obligatoirement par : 'Le lien est dans le premier commentaire. Écris 1, 2 ou 3 pour recevoir ton offre directement.'",
  "captions": {json.dumps(["[= hook exact de la vidéo]"] + [f"Caption courte {i+1}" for i in range(nb_captions - 1)])},
  "tags": ["#vitalitemasculine", "#coupleepanoui", "#energienaturelle", "#bienetre"],
  "description": "Accroche Facebook (100 car max, emojis, commence par le hook exact)",
  "sales_text": "Texte de vente Facebook (4-6 lignes) : commence par le hook exact, problème direct, solution simple, résultat rapide, lien : https://rituel.sterveshop.cloud\\n#vitalitemasculine #coupleepanoui #energienaturelle #bienetre",
  "publication_hint": "Publier entre 10h00 et 11h30",
  "word_count": 0
}}

Règles absolues :
- "tu" jamais "vous"
- phrases très courtes
- aucune explication longue
- pas de validation émotionnelle inutile
- aller vite au résultat
- la 1ère caption = EXACTEMENT le hook
- les tags = toujours les 4 hashtags fournis

Dans "word_count", mets le nombre exact de mots du script."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    result = json.loads(raw)

    script_words = len(result.get("script", "").split())
    max_words = int(words.split("-")[1])

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