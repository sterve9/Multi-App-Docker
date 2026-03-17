import httpx
import asyncio
import logging
import os
import json as _json
from app.core.config import settings

logger = logging.getLogger(__name__)

KIE_BASE_URL = "https://api.kie.ai/api/v1"
MAX_RETRIES  = 3
RETRY_DELAYS = [5, 15, 30]


async def upload_reference_photo(client: httpx.AsyncClient) -> str | None:
    """Upload la photo de référence vers kie.ai et retourne l'URL temporaire."""
    path = settings.REFERENCE_PHOTO_PATH
    if not os.path.exists(path):
        logger.warning(f"Photo de référence introuvable : {path}")
        return None

    with open(path, "rb") as f:
        image_data = f.read()

    filename     = os.path.basename(path)
    content_type = "image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "image/png"

    logger.info(f"Upload référence : {path} ({len(image_data)} bytes)")

    response = await client.post(
        "https://api.kie.ai/api/file-stream-upload",
        headers={"Authorization": f"Bearer {settings.KIE_AI_API_KEY}"},
        files={"file": (filename, image_data, content_type)},
        data={"uploadPath": "reference"},
        timeout=60
    )

    logger.info(f"Upload status: {response.status_code}")
    data = response.json()
    logger.info(f"Upload response: {data}")

    # La réponse kie.ai n'a pas toujours de champ "code"
    if not data.get("success"):
        logger.warning(f"Upload référence échoué : {data.get('msg', data)}")
        return None

    url = data["data"]["downloadUrl"]
    logger.info(f"Photo référence uploadée : {url}")
    return url


async def generate_image(image_prompt: str, post_id: int) -> str:
    """
    Génère une image via kie.ai nano-banana-pro (Image to Image avec référence).
    Télécharge l'image localement et retourne le nom du fichier.
    """
    os.makedirs(settings.IMAGE_OUTPUT_DIR, exist_ok=True)
    headers = {
        "Authorization": f"Bearer {settings.KIE_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            if attempt > 0:
                delay = RETRY_DELAYS[attempt - 1]
                logger.info(f"Post {post_id} — retry {attempt}/{MAX_RETRIES-1} dans {delay}s...")
                await asyncio.sleep(delay)

            async with httpx.AsyncClient(timeout=120.0) as client:

                # Upload photo de référence
                reference_url = await upload_reference_photo(client)

                # Payload Google Imagen4 (photoréaliste, idéal LinkedIn)
                input_data = {
                    "prompt":          image_prompt,
                    "aspect_ratio":    "9:16",
                    "negative_prompt": "cartoon, anime, illustration, painting, drawing, low quality, blurry, deformed"
                }

                payload = {
                    "model": "google/imagen4",
                    "input": input_data
                }

                logger.info(f"Post {post_id} — génération Imagen4 (photoréaliste)")

                logger.info(f"Post {post_id} — payload envoyé : {_json.dumps(payload, indent=2)}")

                # Création de la tâche
                response = await client.post(
                    f"{KIE_BASE_URL}/jobs/createTask",
                    headers=headers,
                    json=payload,
                    timeout=60
                )
                logger.info(f"Post {post_id} — createTask status: {response.status_code}")
                logger.info(f"Post {post_id} — createTask response: {response.text}")
                response.raise_for_status()
                data = response.json()

                if data.get("code") != 200:
                    raise Exception(f"kie.ai erreur : {data.get('msg')}")

                task_id = data["data"]["taskId"]
                logger.info(f"Post {post_id} — task image lancée : {task_id}")

                # Polling
                image_url = None
                for poll_i in range(120):
                    await asyncio.sleep(5)
                    status_resp = await client.get(
                        f"{KIE_BASE_URL}/jobs/recordInfo",
                        headers=headers,
                        params={"taskId": task_id}
                    )
                    record = status_resp.json().get("data", {})
                    state  = record.get("state")

                    if poll_i % 6 == 0:  # log toutes les 30s
                        logger.info(f"Post {post_id} — état {state} (poll {poll_i}), progress={record.get('progress')}")

                    if state == "success":
                        image_url = _json.loads(record["resultJson"])["resultUrls"][0]
                        logger.info(f"Post {post_id} — image générée : {image_url}")
                        break
                    elif state == "fail":
                        raise Exception(f"Génération échouée : {record.get('failMsg')}")

                if not image_url:
                    raise Exception(f"Timeout — post {post_id}")

                # Téléchargement local
                img_response = await client.get(image_url, timeout=60)
                img_response.raise_for_status()

                filename = f"post_{post_id}.png"
                filepath = os.path.join(settings.IMAGE_OUTPUT_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(img_response.content)

                logger.info(f"Post {post_id} — image sauvegardée : {filepath}")
                return filename

        except Exception as e:
            last_exception = e
            logger.warning(f"Post {post_id} — tentative {attempt + 1}/{MAX_RETRIES} échouée : {e}")

    raise Exception(f"Post {post_id} image échouée après {MAX_RETRIES} tentatives : {last_exception}")
