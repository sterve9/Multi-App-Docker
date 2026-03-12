from fastapi import APIRouter, HTTPException
from models.video import PublishRequest
import httpx, os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
STORAGE_PATH = "/app/storage"

@router.post("/publish")
async def publish_to_tiktok(request: PublishRequest):
    """Déclenche le webhook n8n pour publier sur TikTok"""

    video_path = f"{STORAGE_PATH}/videos/{request.video_id}.mp4"
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    payload = {
        "video_id": request.video_id,
        "video_url": f"https://api.tiktok.sterveshop.cloud/api/download/{request.video_id}",
        "description": request.description,
        "tags": request.tags,
        "platform": "tiktok"
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(N8N_WEBHOOK_URL, json=payload)
        response.raise_for_status()

    return {"success": True, "message": "Publication déclenchée via n8n", "job": response.json()}
