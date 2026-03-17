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

REFERENCE_DIR = os.path.dirname(settings.REFERENCE_PHOTO_PATH)  # /app/assets/reference


async def upload_photo(client: httpx.AsyncClient, path: str) -> str | None:
    """Upload une photo vers kie.ai via base64 et retourne l'URL temporaire."""
    import base64
    if not os.path.exists(path):
        return None

    with open(path, "rb") as f:
        raw = f.read()

    filename     = os.path.basename(path)
    b64_data     = base64.b64encode(raw).decode("utf-8")

    response = await client.post(
        "https://api.kie.ai/api/file-base64-upload",
        headers={
            "Authorization": f"Bearer {settings.KIE_AI_API_KEY}",
            "Content-Type":  "application/json"
        },
        json={
            "fileData":   b64_data,
            "fileName":   filename,
            "uploadPath": "characters"
        },
        timeout=60
    )
    logger.info(f"Upload base64 {filename}: status={response.status_code}")
    resp = response.json()
    logger.info(f"Upload base64 response: {resp}")

    if not resp.get("success"):
        logger.warning(f"Upload échoué pour {filename}: {resp}")
        return None

    url = resp["data"]["downloadUrl"]
    logger.info(f"Uploadé: {filename} → {url}")
    return url


async def get_reference_urls(client: httpx.AsyncClient) -> list[str]:
    """
    Retourne les URLs kie.ai de toutes les photos de référence trouvées.
    Cherche photo1.jpg, photo2.jpg, photo3.jpg... et photo.jpg en fallback.
    Minimum 2 URLs requis pour kling_elements.
    """
    if not os.path.exists(REFERENCE_DIR):
        logger.warning(f"Dossier référence introuvable: {REFERENCE_DIR}")
        return []

    # Cherche toutes les photos dans le dossier (triées)
    photos = sorted([
        os.path.join(REFERENCE_DIR, f)
        for f in os.listdir(REFERENCE_DIR)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ])

    if not photos:
        logger.warning("Aucune photo de référence trouvée")
        return []

    logger.info(f"Photos de référence trouvées: {[os.path.basename(p) for p in photos]}")

    # Upload toutes en parallèle
    tasks   = [upload_photo(client, p) for p in photos]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    urls    = [r for r in results if isinstance(r, str)]

    logger.info(f"{len(urls)}/{len(photos)} photos uploadées avec succès")
    return urls


def extract_frame(video_path: str, output_path: str, second: float = 0.5) -> bool:
    """Extrait un frame d'une vidéo avec FFmpeg et crop au format 9:16."""
    try:
        # Extrait le frame puis crop centre en 9:16
        # Pour une vidéo 16:9 (1280x720) : crop h=720, w=405 (720*9/16) centré
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-ss", str(second), "-i", video_path,
                "-vframes", "1",
                "-vf", "crop=ih*9/16:ih:(iw-ih*9/16)/2:0",
                "-q:v", "2", "-f", "image2", output_path
            ],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            logger.warning(f"FFmpeg stderr: {result.stderr[-300:]}")
        return os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        logger.warning(f"Erreur extraction frame: {e}")
        return False


async def generate_image(image_prompt: str, post_id: int) -> str:
    """
    Génère une image LinkedIn avec le vrai visage via kling_elements.
    - Si 2+ photos dispo → kling-3.0/video avec kling_elements → extract frame (vrai visage)
    - Si 1 photo dispo  → kling-2.6/image-to-video → extract frame
    - Sinon             → google/imagen4 (fallback sans visage)
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
                logger.info(f"Post {post_id} — retry {attempt} dans {delay}s...")
                await asyncio.sleep(delay)

            async with httpx.AsyncClient(timeout=300.0) as client:

                reference_urls = await get_reference_urls(client)

                # ── Approche 1 : kling_elements (2+ photos) — meilleure cohérence ──
                if len(reference_urls) >= 2:
                    logger.info(f"Post {post_id} — kling_elements avec {len(reference_urls)} photos")
                    payload = {
                        "model": "kling-3.0/video",
                        "input": {
                            "prompt": f"professional LinkedIn portrait, confident expression, {image_prompt}, @user_reference",
                            "aspect_ratio": "16:9",  # seul ratio supporté — frame crop 9:16 via FFmpeg
                            "duration": "5",
                            "mode": "std",
                            "multi_shots": False,
                            "sound": False,
                            "kling_elements": [{
                                "name": "user_reference",
                                "description": "The user, professional Black African man in his 30s",
                                "element_input_urls": reference_urls
                            }]
                        }
                    }

                # ── Approche 2 : image-to-video (1 photo) ──────────────────────────
                elif len(reference_urls) == 1:
                    logger.info(f"Post {post_id} — Kling I2V avec 1 photo")
                    payload = {
                        "model": "kling-2.6/image-to-video",
                        "input": {
                            "prompt": image_prompt,
                            "image_urls": reference_urls,
                            "sound": False,
                            "duration": "5"
                        }
                    }

                # ── Fallback : Imagen4 ──────────────────────────────────────────────
                else:
                    logger.warning(f"Post {post_id} — fallback Imagen4 (pas de photos)")
                    payload = {
                        "model": "google/imagen4",
                        "input": {
                            "prompt": image_prompt,
                            "aspect_ratio": "9:16",
                            "negative_prompt": "cartoon, anime, blurry, deformed, low quality"
                        }
                    }

                response = await client.post(
                    f"{KIE_BASE_URL}/jobs/createTask",
                    headers=headers, json=payload, timeout=60
                )
                response.raise_for_status()
                data = response.json()
                if data.get("code") != 200:
                    raise Exception(f"kie.ai erreur: {data.get('msg')}")

                task_id = data["data"]["taskId"]
                logger.info(f"Post {post_id} — task lancée: {task_id}")

                # Polling
                result_url = None
                for poll_i in range(120):
                    await asyncio.sleep(5)
                    status_resp = await client.get(
                        f"{KIE_BASE_URL}/jobs/recordInfo",
                        headers=headers, params={"taskId": task_id}
                    )
                    record = status_resp.json().get("data", {})
                    state  = record.get("state")
                    if poll_i % 6 == 0:
                        logger.info(f"Post {post_id} — état {state} (poll {poll_i})")
                    if state == "success":
                        result_url = _json.loads(record["resultJson"])["resultUrls"][0]
                        break
                    elif state == "fail":
                        raise Exception(f"Génération échouée: {record.get('failMsg')}")

                if not result_url:
                    raise Exception(f"Timeout post {post_id}")

                logger.info(f"Post {post_id} — résultat: {result_url}")

                # Si vidéo → extraire le frame avec FFmpeg
                is_video = reference_urls and payload.get("model") != "google/imagen4"
                filename = f"post_{post_id}.jpg" if is_video else f"post_{post_id}.png"
                filepath = os.path.join(settings.IMAGE_OUTPUT_DIR, filename)

                if is_video:
                    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                        video_path = tmp.name
                    try:
                        vid_resp = await client.get(result_url, timeout=120)
                        vid_resp.raise_for_status()
                        with open(video_path, "wb") as f:
                            f.write(vid_resp.content)
                        logger.info(f"Post {post_id} — vidéo téléchargée ({len(vid_resp.content)} bytes)")

                        if not extract_frame(video_path, filepath, second=0.5):
                            extract_frame(video_path, filepath, second=0.0)
                        if not os.path.exists(filepath):
                            raise Exception("Extraction frame échouée")
                    finally:
                        if os.path.exists(video_path):
                            os.unlink(video_path)
                else:
                    img_resp = await client.get(result_url, timeout=60)
                    img_resp.raise_for_status()
                    with open(filepath, "wb") as f:
                        f.write(img_resp.content)

                logger.info(f"Post {post_id} — image sauvegardée: {filepath}")
                return filename

        except Exception as e:
            last_exception = e
            logger.warning(f"Post {post_id} — tentative {attempt + 1}/{MAX_RETRIES} échouée: {e}")

    raise Exception(f"Post {post_id} échoué après {MAX_RETRIES} tentatives: {last_exception}")
