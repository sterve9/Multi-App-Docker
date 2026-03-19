import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from app.core.database import get_db
from app.core.config import settings
from app.models.video import Video, VideoStatus
from app.schemas.video import VideoCreateRequest, VideoResponse, VideoPatchRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/videos", tags=["Videos"])

@router.post("", status_code=201, response_model=VideoResponse)
def create_video(payload: VideoCreateRequest, db: Session = Depends(get_db)):
    video = Video(topic=payload.topic, style=payload.style)
    db.add(video)
    db.commit()
    db.refresh(video)
    return video

@router.get("", response_model=List[VideoResponse])
def list_videos(status: Optional[VideoStatus] = None, db: Session = Depends(get_db)):
    query = db.query(Video)
    if status:
        query = query.filter(Video.status == status)
    return query.order_by(Video.created_at.desc()).limit(50).all()

@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    return video

@router.get("/thumbnail")
def get_thumbnail(path: str):
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Miniature introuvable")
    return FileResponse(path=path, media_type="image/jpeg")

@router.post("/{video_id}/publish", response_model=VideoResponse)
async def publish_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    if video.status != VideoStatus.READY:
        raise HTTPException(status_code=400, detail="La vidéo doit être au statut 'ready' pour être publiée")
    if not settings.N8N_WEBHOOK_URL:
        raise HTTPException(status_code=500, detail="N8N_WEBHOOK_URL non configuré")

    # Passage en statut uploading
    video.status = VideoStatus.UPLOADING
    db.commit()
    db.refresh(video)

    # Déclenchement du workflow n8n
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            await client.post(settings.N8N_WEBHOOK_URL, json={
                "video_id":       video.id,
                "title":          video.title,
                "description":    video.description,
                "tags":           video.tags,
                "video_path":     video.final_video_path,
                "thumbnail_path": video.thumbnail_path,
                "download_url":   f"{settings.BASE_URL}/api/videos/{video.id}/download",
                "thumbnail_url":  f"{settings.BASE_URL}/api/videos/{video.id}/thumbnail" if video.thumbnail_path else None,
            })
    except Exception as e:
        logger.error(f"Erreur webhook n8n pour vidéo {video_id}: {e}")
        video.status = VideoStatus.READY
        db.commit()
        db.refresh(video)
        raise HTTPException(status_code=502, detail=f"Impossible de joindre n8n : {e}")

    return video

@router.get("/{video_id}/download")
def download_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    if not video.final_video_path:
        raise HTTPException(status_code=404, detail="Vidéo pas encore générée")
    if not os.path.exists(video.final_video_path):
        raise HTTPException(status_code=404, detail="Fichier vidéo introuvable sur le serveur")
    return FileResponse(
        path=video.final_video_path,
        media_type="video/mp4",
        filename=f"verites-cachees-{video_id}.mp4"
    )

@router.patch("/{video_id}", response_model=VideoResponse)
def update_video(video_id: int, payload: VideoPatchRequest, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(video, field, value)
    db.commit()
    db.refresh(video)
    return video

@router.delete("/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    db.delete(video)
    db.commit()
    return {"success": True, "message": "Vidéo supprimée"}
