"""KIE API client — wraps Nano Banana 2 and Kling 2.6."""
import os
import httpx
from typing import Optional

KIE_BASE = "https://api.kie.ai"

def _headers() -> dict:
    key = os.getenv("KIE_API_KEY", "")
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


async def create_image_text(prompt: str, aspect_ratio: str = "16:9", resolution: str = "2K") -> str:
    """Nano Banana 2 — text to image. Returns taskId."""
    payload = {
        "model": "nano-banana-2",
        "input": {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "output_format": "jpg",
        },
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{KIE_BASE}/api/v1/jobs/createTask", json=payload, headers=_headers())
        r.raise_for_status()
        data = r.json()
        if data.get("code") != 200:
            raise ValueError(f"KIE error: {data.get('msg')}")
        return data["data"]["taskId"]


async def create_image_from_image(prompt: str, image_urls: list[str], aspect_ratio: str = "16:9", resolution: str = "2K") -> str:
    """Nano Banana 2 — image to image. Returns taskId."""
    payload = {
        "model": "nano-banana-2",
        "input": {
            "prompt": prompt,
            "image_input": image_urls,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "output_format": "jpg",
        },
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{KIE_BASE}/api/v1/jobs/createTask", json=payload, headers=_headers())
        r.raise_for_status()
        data = r.json()
        if data.get("code") != 200:
            raise ValueError(f"KIE error: {data.get('msg')}")
        return data["data"]["taskId"]


async def create_animation(image_url: str, prompt: str, duration: str = "5") -> str:
    """Kling 2.6 — image to video. Returns taskId."""
    payload = {
        "model": "kling-2.6/image-to-video",
        "input": {
            "prompt": prompt,
            "image_urls": [image_url],
            "sound": False,
            "duration": duration,
        },
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{KIE_BASE}/api/v1/jobs/createTask", json=payload, headers=_headers())
        r.raise_for_status()
        data = r.json()
        if data.get("code") != 200:
            raise ValueError(f"KIE error: {data.get('msg')}")
        return data["data"]["taskId"]


async def poll_task(task_id: str) -> dict:
    """Poll task status. Returns dict with state + resultUrls if done."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{KIE_BASE}/api/v1/jobs/recordInfo",
            params={"taskId": task_id},
            headers=_headers(),
        )
        r.raise_for_status()
        data = r.json()
        if data.get("code") != 200:
            raise ValueError(f"KIE poll error: {data.get('msg')}")
        task = data["data"]
        state = task.get("state", "waiting")
        result_urls = []
        if state == "success" and task.get("resultJson"):
            import json
            result = json.loads(task["resultJson"])
            result_urls = result.get("resultUrls", [])
        return {
            "state": state,
            "result_urls": result_urls,
            "fail_msg": task.get("failMsg", ""),
        }
