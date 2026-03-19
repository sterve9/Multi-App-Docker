import httpx
import os
import asyncio
import logging
import base64
from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [5, 15, 30]

# ── Dossier des images de référence du couple ──────────────────
CHARACTERS_DIR = "/app/assets/characters"

KIE_AI_BASE_URL = "https://api.kie.ai/api/v1"


def get_character_reference_urls() -> list:
    """
    Retourne les URLs des images de référence du couple.
    Les fichiers doivent être placés dans /app/assets/characters/
    Formats acceptés : .jpg, .jpeg, .png
    Maximum 4 images recommandé.
    """
    if not os.path.exists(CHARACTERS_DIR):
        logger.warning(f"Dossier characters introuvable : {CHARACTERS_DIR}")
        return []

    refs = []
    for filename in sorted(os.listdir(CHARACTERS_DIR)):
        if filename.lower().endswith((".jpg", ".jpeg", ".png")):
            refs.append(os.path.join(CHARACTERS_DIR, filename))

    if not refs:
        logger.warning("Aucune image de référence trouvée dans /app/assets/characters/")
    else:
        logger.info(f"{len(refs)} image(s) de référence trouvée(s) : {refs}")

    return refs[:4]  # Maximum 4 images


async def upload_reference_to_kie(client: httpx.AsyncClient, image_path: str) -> str:
    """Upload une image locale vers Kie.ai et retourne l'URL."""
    headers = {
        "Authorization": f"Bearer {settings.KIE_AI_API_KEY}"
    }

    with open(image_path, "rb") as f:
        image_data = f.read()

    filename = os.path.basename(image_path)
    content_type = "image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "image/png"

    response = await client.post(
        "https://api.kie.ai/api/file-stream-upload",
        headers=headers,
        files={"file": (filename, image_data, content_type)},
        data={"uploadPath": "characters"},
        timeout=60
    )

    data = response.json()
    if not data.get("success") and data.get("code") != 200:
        raise Exception(f"Upload image référence échoué : {data.get('msg')}")

    url = data["data"]["downloadUrl"]
    logger.info(f"Image référence uploadée : {url}")
    return url


async def generate_single_image_premium(
    client: httpx.AsyncClient,
    prompt: str,
    scene_num: int,
    reference_urls: list
) -> str:
    """
    Génère une vidéo courte via Kie.ai Kling 3.0 avec image reference.
    Retourne l'URL de la vidéo générée.
    """
    headers = {
        "Authorization": f"Bearer {settings.KIE_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    # Construction du payload avec image reference si disponible
    input_data = {
        "prompt": prompt,
        "aspect_ratio": "16:9",
        "duration": "5",
        "mode": "std",
        "multi_shots": False,
        "sound": False
    }

    # Ajout des images de référence si disponibles
    if reference_urls:
        input_data["kling_elements"] = [
            {
                "name": "couple_reference",
                "description": "Kofi and Ama, the main characters of the series",
                "element_input_urls": reference_urls
            }
        ]
        # Modifier le prompt pour référencer les personnages
        input_data["prompt"] = f"{prompt}, @couple_reference"

    payload = {
        "model": "kling-3.0/video",
        "input": input_data
    }

    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            if attempt > 0:
                delay = RETRY_DELAYS[attempt - 1]
                logger.info(f"Scène {scene_num} — retry {attempt}/{MAX_RETRIES-1} dans {delay}s...")
                await asyncio.sleep(delay)

            response = await client.post(
                f"{KIE_AI_BASE_URL}/jobs/createTask",
                headers=headers,
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            data = response.json()

            if data.get("code") != 200:
                raise Exception(f"Kling erreur scène {scene_num}: {data.get('msg')}")

            task_id = data["data"]["taskId"]
            logger.info(f"Scène {scene_num} — task Kling lancée : {task_id}")

            # Polling du statut
            video_url = None
            for _ in range(120):
                await asyncio.sleep(5)
                status_resp = await client.get(
                    f"{KIE_AI_BASE_URL}/jobs/recordInfo",
                    headers=headers,
                    params={"taskId": task_id}
                )
                status_data = status_resp.json()
                record = status_data.get("data", {})
                state = record.get("state")

                if state == "success":
                    import json as _json
                    video_url = _json.loads(record["resultJson"])["resultUrls"][0]
                    break
                elif state == "fail":
                    raise Exception(f"Kling génération échouée scène {scene_num}: {record.get('failMsg')}")

            if not video_url:
                raise Exception(f"Kling timeout scène {scene_num}")

            logger.info(f"Scène {scene_num} — vidéo générée ✅ (tentative {attempt + 1})")
            return video_url

        except Exception as e:
            last_exception = e
            logger.warning(f"Scène {scene_num} — tentative {attempt + 1}/{MAX_RETRIES} échouée : {e}")

    raise Exception(f"Scène {scene_num} échouée après {MAX_RETRIES} tentatives : {last_exception}")


IMAGES_DIR = "/app/outputs/images"


async def generate_single_image_economique(
    prompt: str,
    scene_num: int
) -> str:
    """
    Génère une image via kie.ai Flux-2 Pro (format économique).
    Télécharge l'image localement et retourne le chemin local.
    """
    import json as _json

    os.makedirs(IMAGES_DIR, exist_ok=True)

    headers = {
        "Authorization": f"Bearer {settings.KIE_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "flux-2/pro-text-to-image",
        "input": {
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "resolution": "1K"
        }
    }

    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            if attempt > 0:
                delay = RETRY_DELAYS[attempt - 1]
                logger.info(f"Scène {scene_num} — retry {attempt}/{MAX_RETRIES-1} dans {delay}s...")
                await asyncio.sleep(delay)

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{KIE_AI_BASE_URL}/jobs/createTask",
                    headers=headers,
                    json=payload
                )
                data = response.json()

                if data.get("code") != 200:
                    raise Exception(f"kie.ai erreur scène {scene_num}: {data.get('msg')}")

                task_id = data["data"]["taskId"]
                logger.info(f"Scène {scene_num} — task image lancée : {task_id}")

                for _ in range(120):
                    await asyncio.sleep(5)
                    status_resp = await client.get(
                        f"{KIE_AI_BASE_URL}/jobs/recordInfo",
                        headers=headers,
                        params={"taskId": task_id}
                    )
                    record = status_resp.json().get("data", {})
                    state = record.get("state")

                    if state == "success":
                        url = _json.loads(record["resultJson"])["resultUrls"][0]
                        # Télécharger immédiatement pour éviter l'expiration de l'URL
                        dl = await client.get(url, follow_redirects=True, timeout=120)
                        if dl.status_code != 200:
                            raise Exception(f"Téléchargement image scène {scene_num} échoué: HTTP {dl.status_code}")
                        local_path = f"{IMAGES_DIR}/scene_{scene_num}_{task_id}.jpg"
                        with open(local_path, "wb") as f:
                            f.write(dl.content)
                        logger.info(f"Scène {scene_num} — image sauvegardée localement ✅ ({len(dl.content)} bytes)")
                        return local_path
                    elif state == "fail":
                        raise Exception(f"kie.ai génération échouée scène {scene_num}: {record.get('failMsg')}")

                raise Exception(f"kie.ai timeout scène {scene_num}")

        except Exception as e:
            last_exception = e
            logger.warning(f"Scène {scene_num} — tentative {attempt + 1}/{MAX_RETRIES} échouée : {e}")

    raise Exception(f"Scène {scene_num} échouée après {MAX_RETRIES} tentatives : {last_exception}")


async def generate_images(scenes: list, format: str = "premium") -> list:
    """
    Génère les visuels pour toutes les scènes.
    - format='premium' → Kling 3.0 avec image reference (vidéos courtes)
    - format='economique' → Replicate Flux (images statiques)
    """
    results = []

    if format == "premium":
        # Upload les images de référence une seule fois
        reference_urls = []
        ref_paths = get_character_reference_urls()

        if ref_paths:
            logger.info(f"Upload de {len(ref_paths)} images de référence vers Kie.ai...")
            async with httpx.AsyncClient() as client:
                for ref_path in ref_paths:
                    try:
                        url = await upload_reference_to_kie(client, ref_path)
                        reference_urls.append(url)
                    except Exception as e:
                        logger.warning(f"Upload référence échoué pour {ref_path}: {e}")

        # Générer les vidéos en parallèle (max 3 simultanées)
        semaphore = asyncio.Semaphore(3)

        async def bounded_premium(scene):
            async with semaphore:
                async with httpx.AsyncClient(timeout=600.0) as client:
                    return await generate_single_image_premium(
                        client,
                        scene["image_prompt"],
                        scene["scene_number"],
                        reference_urls
                    )

        results = list(await asyncio.gather(*[bounded_premium(s) for s in scenes]))

    else:
        # Format économique — images kie.ai en parallèle (max 5 simultanés)
        semaphore = asyncio.Semaphore(5)

        async def bounded(scene):
            async with semaphore:
                return await generate_single_image_economique(
                    scene["image_prompt"],
                    scene["scene_number"]
                )

        results = await asyncio.gather(*[bounded(s) for s in scenes])

    return results