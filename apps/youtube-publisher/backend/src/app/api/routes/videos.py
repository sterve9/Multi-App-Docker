import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from app.core.database import get_db
from app.models.video import Video, VideoStatus
from app.schemas.video import VideoCreateRequest, VideoResponse

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
def update_video(video_id: int, payload: dict, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    allowed = ["youtube_url", "youtube_video_id", "status"]
    for field, value in payload.items():
        if field in allowed:
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
