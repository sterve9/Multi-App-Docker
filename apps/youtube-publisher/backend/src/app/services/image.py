import asyncio
import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [5, 15, 30]  # backoff exponentiel en secondes


async def generate_single_image(prompt: str, scene_num: int) -> str:
    await asyncio.sleep(scene_num * 2)  # délai entre chaque scène

    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            if attempt > 0:
                delay = RETRY_DELAYS[attempt - 1]
                logger.info(f"Scene {scene_num} — retry {attempt}/{MAX_RETRIES - 1} dans {delay}s...")
                await asyncio.sleep(delay)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/predictions",
                    headers={
                        "Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "input": {
                            "prompt": prompt,
                            "aspect_ratio": "16:9",
                            "output_format": "jpg",
                            "output_quality": 90
                        }
                    },
                    timeout=60
                )
                prediction = response.json()

                if "id" not in prediction:
                    # Erreur de crédit ou autre erreur Replicate — pas la peine de retry
                    error_detail = prediction.get("detail", str(prediction))
                    if "credit" in str(error_detail).lower() or "insufficient" in str(error_detail).lower():
                        raise Exception(f"Replicate error scene {scene_num}: {prediction}")
                    raise ValueError(f"Replicate no ID scene {scene_num}: {prediction}")

                pred_id = prediction["id"]
                logger.info(f"Scene {scene_num} — prediction lancée : {pred_id}")

                for _ in range(40):
                    await asyncio.sleep(5)
                    status_resp = await client.get(
                        f"https://api.replicate.com/v1/predictions/{pred_id}",
                        headers={"Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}"}
                    )
                    data = status_resp.json()

                    if data["status"] == "succeeded":
                        logger.info(f"Scene {scene_num} — image générée ✅ (tentative {attempt + 1})")
                        return data["output"]
                    elif data["status"] == "failed":
                        raise ValueError(f"Image generation failed for scene {scene_num}")

                raise ValueError(f"Timeout generating image for scene {scene_num}")

        except Exception as e:
            last_exception = e
            error_str = str(e)

            # Ne pas retry sur les erreurs de crédit insuffisant
            if "credit" in error_str.lower() or "insufficient" in error_str.lower():
                logger.error(f"Scene {scene_num} — crédit insuffisant, abandon immédiat")
                raise

            logger.warning(f"Scene {scene_num} — tentative {attempt + 1}/{MAX_RETRIES} échouée : {error_str}")

    logger.error(f"Scene {scene_num} — échec après {MAX_RETRIES} tentatives")
    raise Exception(f"Scene {scene_num} échouée après {MAX_RETRIES} tentatives : {last_exception}")


async def generate_images(scenes: list) -> list:
    images = []
    for scene in scenes:
        url = await generate_single_image(scene["image_prompt"], scene["scene_number"])
        images.append(url)
        await asyncio.sleep(3)  # pause entre chaque image
    return images