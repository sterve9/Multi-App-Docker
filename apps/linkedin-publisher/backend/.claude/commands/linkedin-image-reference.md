# LinkedIn Publisher — Image de Référence (Photo du User)

## Objectif
Générer des images LinkedIn qui montrent le vrai visage de l'utilisateur.
L'utilisateur est un **homme africain dans la trentaine, peau noire, barbe courte, carrure athlétique**.
Sa photo de référence est baked dans l'image Docker : `/app/assets/reference/photo.jpg`

---

## Ce qui NE fonctionne PAS (leçons apprises)

| Modèle | Problème |
|--------|---------|
| `nano-banana-pro` avec `image_url` | Le paramètre `image_url` est **ignoré** — génère des personnes aléatoires (homme inconnu, femme, etc.). C'est un modèle text-to-image pur malgré la mention "Image to Image" dans le marketplace |
| `nano-banana-pro` avec `strength: 0.2` | Idem — strength ignoré, toujours aléatoire |
| Volume Docker `reference_photo:/app/assets/reference` | **Cache** la photo baked dans l'image. Le volume vide écrase le fichier → `reference_url = None` |

---

## ✅ Solution actuelle — VRAI VISAGE GARANTI

**Approche** : Kling 2.6 Image-to-Video + extraction de frame FFmpeg
1. Upload `photo.jpg` → kie.ai → URL temporaire
2. `kling-2.6/image-to-video` avec `image_urls: [reference_url]` → clip 5s du vrai visage
3. FFmpeg extrait le frame à t=0.5s → image PNG LinkedIn
4. Le visage est garanti car le modèle ANIME la photo originale

```python
payload = {
    "model": "kling-2.6/image-to-video",
    "input": {
        "prompt": image_prompt,    # décrit l'ambiance/mouvement
        "image_urls": [reference_url],
        "sound": False,
        "duration": "5"
    }
}
# Puis: ffmpeg -ss 0.5 -i video.mp4 -vframes 1 output.jpg
```

**Fallback** : `google/imagen4` si photo non disponible

---

## Solution actuelle (fallback acceptable)

**Modèle** : `google/imagen4`
**Approche** : text-to-image avec description détaillée du personnage

```python
payload = {
    "model": "google/imagen4",
    "input": {
        "prompt": image_prompt,  # Claude décrit un homme africain + la scène
        "aspect_ratio": "9:16",
        "negative_prompt": "cartoon, anime, blurry, deformed, low quality, woman, female"
    }
}
```

**Prompt Claude** (dans `content.py`) :
```
"image_prompt": "Photorealistic portrait of a professional Black African man in his early 30s,
athletic build, dark skin, short neat beard, confident intense gaze,
[specific professional scene related to the topic],
dramatic cinematic lighting, ultra sharp, premium quality, 9:16 vertical format, LinkedIn style."
```

---

## Solution cible : modèle face-reference

Quand l'utilisateur trouve un modèle dans le marketplace kie.ai, l'intégrer ainsi :

### Pattern d'intégration (à adapter selon le modèle)

```python
# 1. Upload la photo de référence
reference_url = await upload_reference_photo(client)

# 2. Payload avec face reference
payload = {
    "model": "NOM_DU_MODELE_ICI",
    "input": {
        "prompt": image_prompt,
        "aspect_ratio": "9:16",
        # Paramètre face reference — tester selon le modèle :
        "image_url": reference_url,          # option A
        "face_image_url": reference_url,     # option B
        "reference_image_url": reference_url, # option C
        "strength": 0.3,                     # bas = préserve le visage
    }
}
```

### Modèles à chercher dans kie.ai marketplace
- **InstantID** — face identity preservation (meilleur choix)
- **IP-Adapter Face** — face consistent generation
- **Flux PuLID** — Flux-based face reference
- **PhotoMaker** — face consistent style transfer
- Tout modèle mentionnant "face reference", "identity", "portrait consistent"

---

## Architecture fichiers

```
apps/linkedin-publisher/backend/
├── assets/
│   └── reference/
│       └── photo.jpg          ← photo baked dans l'image Docker (COPY ./assets)
├── src/app/services/
│   ├── image.py               ← génération image + upload référence
│   └── content.py             ← Claude génère hook + reflection + image_prompt
└── docker-compose.yml
    # IMPORTANT : PAS de volume sur /app/assets/reference (écrase la photo)
    # N8N_WEBHOOK_URL = http://n8n:5678/webhook/linkedin-publish (URL interne Docker)
```

---

## Checklist pour intégrer un nouveau modèle face-reference

1. [ ] Récupérer le nom exact du modèle dans kie.ai
2. [ ] Tester avec `image_url` d'abord (paramètre le plus courant)
3. [ ] Vérifier les logs : chercher `img2img avec référence` pour confirmer que la photo est uploadée
4. [ ] Si résultat encore trop transformé → baisser `strength` (essayer 0.1)
5. [ ] Si résultat trop proche de la photo originale → monter `strength` (essayer 0.4)
6. [ ] Modifier `content.py` : quand face-reference actif, le `image_prompt` doit décrire la **scène** (pas le personnage — c'est la photo qui le définit)
