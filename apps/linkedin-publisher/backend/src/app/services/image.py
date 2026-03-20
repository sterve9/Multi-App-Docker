import httpx
import asyncio
import logging
import os
import json as _json
from app.core.config import settings

logger = logging.getLogger(__name__)

KIE_BASE_URL = "https://api.kie.ai/api/v1"


async def generate_image(image_prompt: str, post_id: int) -> str:
    """
    Génère une image LinkedIn via google/imagen4.
    Rapide (~30-60s), fiable, pas de référence photo requise.
    """
    os.makedirs(settings.IMAGE_OUTPUT_DIR, exist_ok=True)

    headers = {
        "Authorization": f"Bearer {settings.KIE_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "google/imagen4",
        "input": {
            "prompt": image_prompt,
            "aspect_ratio": "9:16",
            "negative_prompt": (
                "cartoon, anime, illustration, painting, drawing, "
                "blurry, deformed, low quality, ugly, "
                "woman, female, girl, feminine, white person, asian person"
            )
        }
    }

    logger.info(f"Post {post_id} — génération Imagen4")

    async with httpx.AsyncClient(timeout=300.0) as client:

        # Créer la tâche
        response = await client.post(
            f"{KIE_BASE_URL}/jobs/createTask",
            headers=headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        data = response.json()

        if data.get("code") != 200:
            raise Exception(f"kie.ai erreur création tâche: {data.get('msg')}")

        task_id = data["data"]["taskId"]
        logger.info(f"Post {post_id} — task lancée: {task_id}")

        # Polling — Imagen4 répond en 30-90s
        # 60 polls × 5s = 5 minutes max
        for poll_i in range(60):
            await asyncio.sleep(5)

            status_resp = await client.get(
                f"{KIE_BASE_URL}/jobs/recordInfo",
                headers=headers,
                params={"taskId": task_id}
            )
            record = status_resp.json().get("data", {})
            state  = record.get("state")

            if poll_i % 6 == 0:
                logger.info(f"Post {post_id} — état {state} (poll {poll_i})")

            if state == "success":
                result_url = _json.loads(record["resultJson"])["resultUrls"][0]
                logger.info(f"Post {post_id} — image générée: {result_url[:80]}...")
                break
            elif state == "fail":
                raise Exception(f"Post {post_id} — génération échouée: {record.get('failMsg')}")
        else:
            raise Exception(f"Post {post_id} — timeout après 5 minutes (Imagen4)")

        # Télécharger l'image
        filepath = os.path.join(settings.IMAGE_OUTPUT_DIR, f"post_{post_id}.png")
        img_resp = await client.get(result_url, timeout=60, follow_redirects=True)
        img_resp.raise_for_status()
        with open(filepath, "wb") as f:
            f.write(img_resp.content)

        logger.info(f"Post {post_id} — image sauvegardée: {filepath} ({len(img_resp.content)} bytes)")
        return f"post_{post_id}.png"
