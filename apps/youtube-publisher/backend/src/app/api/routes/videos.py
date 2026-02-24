import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
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

@router.delete("/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    db.delete(video)
    db.commit()
    return {"success": True, "message": "Vidéo supprimée"}
