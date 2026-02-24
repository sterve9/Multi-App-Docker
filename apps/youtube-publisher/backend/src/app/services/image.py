import asyncio
import httpx
from app.core.config import settings

async def generate_single_image(prompt: str, scene_num: int) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/predictions",
            headers={"Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}", "Content-Type": "application/json"},
            json={"input": {"prompt": prompt, "aspect_ratio": "16:9", "output_format": "jpg", "output_quality": 90}},
            timeout=60
        )
        prediction = response.json()
        pred_id = prediction["id"]

        for _ in range(30):
            await asyncio.sleep(3)
            status_resp = await client.get(
                f"https://api.replicate.com/v1/predictions/{pred_id}",
                headers={"Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}"}
            )
            data = status_resp.json()
            if data["status"] == "succeeded":
                return data["output"]
            elif data["status"] == "failed":
                raise Exception(f"Image generation failed for scene {scene_num}")
        
        raise Exception(f"Timeout generating image for scene {scene_num}")

async def generate_images(scenes: list) -> list:
    images = []
    for scene in scenes:
        url = await generate_single_image(scene["image_prompt"], scene["scene_number"])
        images.append(url)
    return images
