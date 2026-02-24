import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.video import Video, VideoStatus
from app.services.pipeline import run_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["Generate"])

@router.post("/{video_id}")
async def generate_video(video_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    if video.status not in [VideoStatus.DRAFT, VideoStatus.FAILED]:
        raise HTTPException(status_code=400, detail="La vidéo est déjà en cours de traitement")
    background_tasks.add_task(run_pipeline, video_id)
    return {"message": "Pipeline lancé", "video_id": video_id}
