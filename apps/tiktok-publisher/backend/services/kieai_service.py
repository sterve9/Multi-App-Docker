import os
import asyncio
import httpx
import aiofiles
from dotenv import load_dotenv

load_dotenv()

KIE_AI_API_KEY = os.getenv("KIE_AI_API_KEY")
KIE_AI_BASE_URL = "https://api.kie.ai/api/v1"


async def generate_image(prompt: str, output_path: str) -> str:
    """Génère une image via Kie.ai"""

    headers = {
        "Authorization": f"Bearer {KIE_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "prompt": prompt,
        "size": "2:3",
        "isEnhance": False,
        "uploadCn": False,
        "enableFallback": True,
        "fallbackModel": "FLUX_MAX"
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.post(
            f"{KIE_AI_BASE_URL}/gpt4o-image/generate",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        data = response.json()

        if data.get("code") != 200:
            raise Exception(f"Kie.ai error: {data.get('msg', 'Unknown error')}")

        task_id = data["data"]["taskId"]

        image_url = None
        for _ in range(60):
            await asyncio.sleep(5)
            status_resp = await client.get(
                f"{KIE_AI_BASE_URL}/gpt4o-image/record-info",
                headers=headers,
                params={"taskId": task_id}
            )
            status_data = status_resp.json()
            record = status_data.get("data", {})

            success_flag = record.get("successFlag")
            status = record.get("status")

            if success_flag == 1 or status == "SUCCESS":
                result_urls = record.get("response", {}).get("resultUrls", [])
                if result_urls:
                    image_url = result_urls[0]
                    break
            elif success_flag == -1 or status == "FAILED":
                raise Exception(f"Kie.ai generation failed: {record.get('errorMessage')}")

        if not image_url:
            raise Exception("Kie.ai image generation timeout")

        img_response = await client.get(image_url)
        async with aiofiles.open(output_path, "wb") as f:
            await f.write(img_response.content)

    return output_path


async def generate_multiple_images(
    base_prompt: str,
    output_dir: str,
    video_id: str,
    count: int = 3
) -> list:
    """
    Génère plusieurs images en parallèle avec des angles variés.
    Retourne la liste des chemins des images générées avec succès.
    """

    # Variations de scènes pour chaque segment
    variations = [
        f"{base_prompt}, close-up portrait shot, warm candlelight, intimate atmosphere",
        f"{base_prompt}, flat lay overhead view, natural ingredients spread on dark wood",
        f"{base_prompt}, hands holding remedy, golden hour backlight, bokeh background",
        f"{base_prompt}, macro detail shot, texture of herbs and spices, rich colors",
        f"{base_prompt}, wide lifestyle shot, morning ritual, soft natural light",
    ]

    selected = variations[:count]

    output_paths = [
        os.path.join(output_dir, f"{video_id}_img_{i}.jpg")
        for i in range(count)
    ]

    # Lancement en parallèle
    tasks = [
        generate_image(prompt, path)
        for prompt, path in zip(selected, output_paths)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Ne garder que les succès
    valid_paths = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"[kieai] Image {i} échouée: {result}")
        else:
            valid_paths.append(output_paths[i])

    if not valid_paths:
        raise Exception("Toutes les générations d'images ont échoué")

    print(f"[kieai] {len(valid_paths)}/{count} images générées avec succès")
    return valid_paths


async def generate_video(prompt: str, output_path: str, duration: int = 5) -> str:
    """Génère une vidéo courte via Kie.ai (Veo3 Fast)"""

    headers = {
        "Authorization": f"Bearer {KIE_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "prompt": prompt,
        "aspectRatio": "9:16",
        "model": "veo3-fast"
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.post(
            f"{KIE_AI_BASE_URL}/video/veo3/generate",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        data = response.json()

        if data.get("code") != 200:
            raise Exception(f"Kie.ai video error: {data.get('msg', 'Unknown error')}")

        task_id = data["data"]["taskId"]

        video_url = None
        for _ in range(120):
            await asyncio.sleep(5)
            status_resp = await client.get(
                f"{KIE_AI_BASE_URL}/video/veo3/record-info",
                headers=headers,
                params={"taskId": task_id}
            )
            status_data = status_resp.json()
            record = status_data.get("data", {})

            success_flag = record.get("successFlag")
            status = record.get("status")

            if success_flag == 1 or status == "SUCCESS":
                result_urls = record.get("response", {}).get("resultUrls", [])
                if result_urls:
                    video_url = result_urls[0]
                    break
                video_url = record.get("response", {}).get("url")
                if video_url:
                    break
            elif success_flag == -1 or status == "FAILED":
                raise Exception(f"Kie.ai video failed: {record.get('errorMessage')}")

        if not video_url:
            raise Exception("Kie.ai video generation timeout")

        vid_response = await client.get(video_url)
        async with aiofiles.open(output_path, "wb") as f:
            await f.write(vid_response.content)

    return output_path