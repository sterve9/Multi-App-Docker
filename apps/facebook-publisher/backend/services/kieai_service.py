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
    """Génère plusieurs images en parallèle avec des angles variés."""

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

    tasks = [
        generate_image(prompt, path)
        for prompt, path in zip(selected, output_paths)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

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


async def generate_video_veo3(
    prompt: str,
    script: str,
    output_path: str,
    aspect_ratio: str = "9:16",
    model: str = "veo3_fast"
) -> str:
    """
    Génère une vidéo avec voix intégrée via Veo3.1 (Kie.ai).

    Structure réponse polling (source: doc officielle Kie.ai) :
    {
      "code": 200,
      "data": {
        "successFlag": 0|1|2|3,
        "response": {
          "resultUrls": ["https://...mp4"],
          "originUrls": ["https://...mp4"],
          "resolution": "1080p"
        },
        "errorMessage": null
      }
    }

    successFlag: 0=en cours, 1=succès, 2=échec, 3=échec upstream
    """

    headers = {
        "Authorization": f"Bearer {KIE_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    # Prompt complet avec dialogue intégré
    full_prompt = (
        f"African man 45-50 years old, wise and calm expression, "
        f"traditional African setting, warm golden candlelight, "
        f"natural honey ginger cinnamon visible on table, "
        f"speaking directly to camera with conviction. "
        f"He says: \"{script[:300]}\". "
        f"Authentic, cinematic, vertical 9:16 format."
    )

    payload = {
        "prompt": full_prompt,
        "model": model,
        "aspect_ratio": aspect_ratio,
        "generationType": "TEXT_2_VIDEO",
        "enableTranslation": True,  # Traduit automatiquement en anglais
    }

    print(f"[veo3] Démarrage — modèle: {model}, aspect: {aspect_ratio}")
    print(f"[veo3] Prompt ({len(full_prompt)} chars): {full_prompt[:100]}...")

    async with httpx.AsyncClient(timeout=600.0) as client:

        # ── Créer la tâche ────────────────────────────────────────────────────
        response = await client.post(
            f"{KIE_AI_BASE_URL}/veo/generate",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        creation_data = response.json()
        print(f"[veo3] Réponse création: code={creation_data.get('code')}, msg={creation_data.get('msg')}")

        if creation_data.get("code") != 200:
            raise Exception(f"Veo3 création échouée: {creation_data.get('msg', 'Unknown error')}")

        task_id = creation_data["data"]["taskId"]
        print(f"[veo3] Task créée: {task_id}")

        # ── Polling — structure exacte selon doc officielle ───────────────────
        video_url = None
        for attempt in range(180):  # 180 × 5s = 900s max
            await asyncio.sleep(5)

            poll_resp = await client.get(
                f"{KIE_AI_BASE_URL}/veo/record-info",
                headers=headers,
                params={"taskId": task_id}
            )
            poll_data = poll_resp.json()

            # Log toutes les 10 tentatives
            if attempt % 10 == 0:
                data_field = poll_data.get("data", {})
                success_flag = data_field.get("successFlag", "?")
                print(f"[veo3] Attempt {attempt}/180 — successFlag: {success_flag}")

            # Vérifier le code HTTP de la réponse
            if poll_data.get("code") != 200:
                if attempt % 10 == 0:
                    print(f"[veo3] Code non-200: {poll_data.get('code')} — {poll_data.get('msg')}")
                continue

            data_field = poll_data.get("data", {})
            success_flag = data_field.get("successFlag")

            # ── successFlag == 1 : succès ─────────────────────────────────────
            if success_flag == 1:
                response_field = data_field.get("response", {})
                result_urls = response_field.get("resultUrls", [])
                origin_urls = response_field.get("originUrls", [])

                # Préférer resultUrls, sinon originUrls
                if result_urls:
                    video_url = result_urls[0]
                elif origin_urls:
                    video_url = origin_urls[0]

                if video_url:
                    resolution = response_field.get("resolution", "unknown")
                    print(f"[veo3] Vidéo prête! Resolution: {resolution}")
                    print(f"[veo3] URL: {video_url[:80]}...")
                    break
                else:
                    print(f"[veo3] successFlag=1 mais aucune URL trouvée — réponse: {response_field}")

            # ── successFlag == 2 ou 3 : échec ─────────────────────────────────
            elif success_flag in [2, 3]:
                error_msg = data_field.get("errorMessage") or f"successFlag={success_flag}"
                error_code = data_field.get("errorCode")
                raise Exception(f"Veo3 generation failed (code {error_code}): {error_msg}")

            # ── successFlag == 0 : en cours ───────────────────────────────────
            # Continue polling

        if not video_url:
            raise Exception(f"Veo3 timeout après {180 * 5}s — taskId: {task_id}")

        # ── Télécharger la vidéo ──────────────────────────────────────────────
        print(f"[veo3] Téléchargement en cours...")
        vid_response = await client.get(video_url, timeout=120.0)
        async with aiofiles.open(output_path, "wb") as f:
            await f.write(vid_response.content)

        file_size = os.path.getsize(output_path)
        print(f"[veo3] Vidéo sauvegardée: {output_path} ({file_size / 1024 / 1024:.1f} MB)")

    return output_path


async def generate_video(prompt: str, output_path: str, duration: int = 5) -> str:
    """Génère une vidéo via Kling 3.0 — conservé pour compatibilité."""

    headers = {
        "Authorization": f"Bearer {KIE_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "kling-3.0/video",
        "input": {
            "prompt": prompt,
            "aspect_ratio": "9:16",
            "duration": str(duration),
            "mode": "std",
            "multi_shots": False,
            "sound": False
        }
    }

    async with httpx.AsyncClient(timeout=600.0) as client:
        response = await client.post(
            f"{KIE_AI_BASE_URL}/jobs/createTask",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        data = response.json()

        if data.get("code") != 200:
            raise Exception(f"Kling error: {data.get('msg', 'Unknown error')}")

        task_id = data["data"]["taskId"]
        print(f"[kling] Task créée: {task_id}")

        video_url = None
        for attempt in range(180):
            await asyncio.sleep(5)
            status_resp = await client.get(
                f"{KIE_AI_BASE_URL}/jobs/detail",
                headers=headers,
                params={"taskId": task_id}
            )
            status_data = status_resp.json()
            record = status_data.get("data", {})
            status = record.get("status")

            if attempt % 10 == 0:
                print(f"[kling] Attempt {attempt}/180 — status: {status}")

            if status == "SUCCESS":
                works = record.get("output", {}).get("works", [])
                if works:
                    video_url = works[0].get("resource", {}).get("resource")
                    break
            elif status == "FAILED":
                raise Exception(f"Kling failed: {record.get('failedMsg')}")

        if not video_url:
            raise Exception("Kling video generation timeout")

        vid_response = await client.get(video_url)
        async with aiofiles.open(output_path, "wb") as f:
            await f.write(vid_response.content)

    return output_path