from fastapi import APIRouter
from fastapi.responses import FileResponse
import os

router = APIRouter()

STORAGE_PATH = "/app/storage"

@router.get("/videos/{video_id}.mp4")
async def stream_video(video_id: str):
    """Sert le fichier vidéo généré"""
    path = f"{STORAGE_PATH}/videos/{video_id}.mp4"
    if not os.path.exists(path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    return FileResponse(path, media_type="video/mp4")

@router.get("/download/{video_id}")
async def download_video(video_id: str):
    """Téléchargement forcé de la vidéo"""
    path = f"{STORAGE_PATH}/videos/{video_id}.mp4"
    if not os.path.exists(path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    return FileResponse(
        path,
        media_type="video/mp4",
        headers={"Content-Disposition": f"attachment; filename=tiktok-{video_id}.mp4"}
    )

@router.get("/list")
async def list_videos():
    """Liste toutes les vidéos générées"""
    videos_dir = f"{STORAGE_PATH}/videos"
    if not os.path.exists(videos_dir):
        return {"videos": []}
    files = [f for f in os.listdir(videos_dir) if f.endswith(".mp4")]
    return {"videos": files, "count": len(files)}
