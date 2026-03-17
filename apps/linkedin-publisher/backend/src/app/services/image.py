import httpx
import asyncio
import logging
import os
import json as _json
import subprocess
import tempfile
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
    data = response.json()
    if not data.get("success"):
        logger.warning(f"Upload référence échoué : {data}")
        return None

    url = data["data"]["downloadUrl"]
    logger.info(f"Photo référence uploadée : {url}")
    return url


def extract_frame_from_video(video_path: str, output_path: str, second: float = 0.5) -> bool:
    """Extrait un frame d'une vidéo avec FFmpeg. Retourne True si succès."""
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", str(second),
                "-i", video_path,
                "-vframes", "1",
                "-q:v", "2",
                "-f", "image2",
                output_path
            ],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            logger.warning(f"FFmpeg stderr: {result.stderr[-300:]}")
            return False
        return os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        logger.warning(f"Erreur extraction frame: {e}")
        return False


async def generate_image_with_face(
    client: httpx.AsyncClient,
    headers: dict,
    image_prompt: str,
    post_id: int,
    reference_url: str
) -> str:
    """
    Génère une image avec le vrai visage via Kling 2.6 Image-to-Video.
    Upload la photo → génère clip 5s → extrait frame → retourne chemin local.
    """
    os.makedirs(settings.IMAGE_OUTPUT_DIR, exist_ok=True)

    payload = {
        "model": "kling-2.6/image-to-video",
        "input": {
            "prompt": image_prompt,
            "image_urls": [reference_url],
            "sound": False,
            "duration": "5"
        }
    }
    logger.info(f"Post {post_id} — Kling I2V avec visage réel, prompt: {image_prompt[:80]}...")

    response = await client.post(
        f"{KIE_BASE_URL}/jobs/createTask",
        headers=headers, json=payload, timeout=60
    )
    response.raise_for_status()
    data = response.json()
    if data.get("code") != 200:
        raise Exception(f"Kling I2V erreur: {data.get('msg')}")

    task_id = data["data"]["taskId"]
    logger.info(f"Post {post_id} — task Kling I2V lancée: {task_id}")

    # Polling (max 10 min)
    video_url = None
    for poll_i in range(120):
        await asyncio.sleep(5)
        status_resp = await client.get(
            f"{KIE_BASE_URL}/jobs/recordInfo",
            headers=headers, params={"taskId": task_id}
        )
        record = status_resp.json().get("data", {})
        state  = record.get("state")
        if poll_i % 6 == 0:
            logger.info(f"Post {post_id} — I2V état {state} (poll {poll_i})")
        if state == "success":
            video_url = _json.loads(record["resultJson"])["resultUrls"][0]
            break
        elif state == "fail":
            raise Exception(f"Kling I2V échoué: {record.get('failMsg')}")

    if not video_url:
        raise Exception(f"Kling I2V timeout post {post_id}")

    logger.info(f"Post {post_id} — vidéo générée: {video_url}")

    # Télécharger la vidéo dans un fichier temporaire
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        video_path = tmp.name

    try:
        video_resp = await client.get(video_url, timeout=120)
        video_resp.raise_for_status()
        with open(video_path, "wb") as f:
            f.write(video_resp.content)
        logger.info(f"Post {post_id} — vidéo téléchargée ({len(video_resp.content)} bytes)")

        # Extraire le frame à 0.5s (évite le fade-in)
        filename = f"post_{post_id}.jpg"
        output_path = os.path.join(settings.IMAGE_OUTPUT_DIR, filename)
        if not extract_frame_from_video(video_path, output_path, second=0.5):
            # Fallback : frame 0
            extract_frame_from_video(video_path, output_path, second=0.0)

        if not os.path.exists(output_path):
            raise Exception("Extraction frame échouée")

        logger.info(f"Post {post_id} — frame extrait → {output_path}")
        return filename

    finally:
        if os.path.exists(video_path):
            os.unlink(video_path)


async def generate_image(image_prompt: str, post_id: int) -> str:
    """
    Génère une image LinkedIn.
    - Si photo de référence disponible → Kling 2.6 I2V (vrai visage garanti)
    - Sinon → Google Imagen4 (photoréaliste mais visage générique)
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

            async with httpx.AsyncClient(timeout=300.0) as client:

                # Essayer avec le vrai visage si la photo est disponible
                reference_url = await upload_reference_photo(client)

                if reference_url:
                    filename = await generate_image_with_face(
                        client, headers, image_prompt, post_id, reference_url
                    )
                    return filename

                # Fallback Imagen4 si pas de photo de référence
                logger.warning(f"Post {post_id} — pas de photo référence, fallback Imagen4")
                payload = {
                    "model": "google/imagen4",
                    "input": {
                        "prompt": image_prompt,
                        "aspect_ratio": "9:16",
                        "negative_prompt": "cartoon, anime, blurry, deformed, low quality, woman, female"
                    }
                }

                response = await client.post(
                    f"{KIE_BASE_URL}/jobs/createTask",
                    headers=headers, json=payload, timeout=60
                )
                response.raise_for_status()
                data = response.json()
                if data.get("code") != 200:
                    raise Exception(f"Imagen4 erreur: {data.get('msg')}")

                task_id = data["data"]["taskId"]
                logger.info(f"Post {post_id} — task Imagen4: {task_id}")

                image_url = None
                for _ in range(120):
                    await asyncio.sleep(5)
                    status_resp = await client.get(
                        f"{KIE_BASE_URL}/jobs/recordInfo",
                        headers=headers, params={"taskId": task_id}
                    )
                    record = status_resp.json().get("data", {})
                    state  = record.get("state")
                    if state == "success":
                        image_url = _json.loads(record["resultJson"])["resultUrls"][0]
                        break
                    elif state == "fail":
                        raise Exception(f"Imagen4 échoué: {record.get('failMsg')}")

                if not image_url:
                    raise Exception(f"Imagen4 timeout post {post_id}")

                img_response = await client.get(image_url, timeout=60)
                img_response.raise_for_status()

                filename = f"post_{post_id}.png"
                filepath = os.path.join(settings.IMAGE_OUTPUT_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(img_response.content)

                logger.info(f"Post {post_id} — Imagen4 sauvegardée: {filepath}")
                return filename

        except Exception as e:
            last_exception = e
            logger.warning(f"Post {post_id} — tentative {attempt + 1}/{MAX_RETRIES} échouée: {e}")

    raise Exception(f"Post {post_id} image échouée après {MAX_RETRIES} tentatives: {last_exception}")
