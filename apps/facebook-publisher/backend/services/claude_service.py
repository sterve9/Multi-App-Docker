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

    # Types de hooks prouvés — Claude pioche dans cette liste en rotation
    hook_types = """
TYPES DE HOOKS PROUVÉS (choisir 1 en rotation, ne jamais répéter le même style deux fois) :
  A. Douleur relationnelle   → "Ta femme [action négative] depuis [durée]..."
  B. Honte/tabou             → "Je n'osais plus [action intime] devant ma femme..."
  C. Curiosité choquante     → "Ce [ingrédient] que les médecins ne veulent pas que tu connaisses..."
  D. Transformation rapide   → "En 3 jours, elle m'a demandé ce que j'avais changé..."

HOOKS INTERDITS (prouvés inefficaces, données réelles) :
  ✗ Commencer par le nom du produit ("Rituel Ancestral...")
  ✗ Commencer par un bénéfice générique ("Retrouve ta vitalité...", "Booste ton énergie...")
  ✗ Question trop douce ("Tu veux plus d'énergie ?")"""

    prompt = f"""Tu es un expert en Reels Facebook pour la vitalité masculine naturelle.
Tu génères des scripts basés sur des données de performance réelles (rétention mesurée sur 4 Reels).

Thème : "{theme}" | Format : {format} | Durée : {duration} secondes

{hook_types}

STRUCTURE OBLIGATOIRE DU REEL (3 phases, {duration}s max) :
1. HOOK DOULEUR ÉMOTIONNELLE [0-3s] — JAMAIS un bénéfice, TOUJOURS une souffrance vécue.
   Choisir un type dans la liste ci-dessus. Max 8 mots. Arrête le scroll immédiatement.
2. SOLUTION + DÉMONSTRATION CONCRÈTE [3-20s] — Montre le Rituel Ancestral en action.
   Ingrédients (miel, gingembre, cannelle, citron), gestes précis, résultats en 3-7 jours.
   Pas de promesses vagues : des faits concrets ("elle a remarqué en 3 jours").
3. DOUBLE CTA FINAL [20s+] — Les 2 phrases suivantes, dans cet ordre EXACT :
   "Le lien est dans le premier commentaire." puis "Suis la page pour la suite."

CONTRAINTE LONGUEUR :
- Script voix off : EXACTEMENT entre {words} mots (ElevenLabs = 2.5 mots/sec).
- Compte les mots avant de répondre.

Réponds UNIQUEMENT en JSON valide :
{{
  "hook": "Le hook DOULEUR ÉMOTIONNELLE exact (max 8 mots, type A/B/C/D)",
  "script": "Script complet {words} mots : HOOK DOULEUR → SOLUTION CONCRÈTE → DOUBLE CTA. Utilise 'tu'. Terminer obligatoirement par : 'Le lien est dans le premier commentaire. Suis la page pour la suite.'",
  "captions": {json.dumps(["[= hook exact de la vidéo]"] + [f"Caption courte {i+1}" for i in range(nb_captions - 1)])},
  "tags": ["#vitalitemasculine", "#coupleepanoui", "#energienaturelle", "#bienetre"],
  "description": "Accroche Facebook (100 car max, emojis, commence par le hook exact de la vidéo)",
  "sales_text": "Texte de vente Facebook (4-6 lignes) : commence par le hook exact, problème empathique, solution concrète, résultats dès J3, lien : https://rituel.sterveshop.cloud\\n#vitalitemasculine #coupleepanoui #energienaturelle #bienetre",
  "publication_hint": "Publier entre 10h00 et 11h30",
  "word_count": 0
}}

Règles absolues :
- "tu" jamais "vous"
- Phrases courtes, 1 idée par phrase
- La 1ère caption = EXACTEMENT la même phrase que le hook
- Les tags = toujours les 4 hashtags fournis, rien d'autre
- Le sales_text commence par le hook exact de la vidéo
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