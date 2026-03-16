import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from app.core.database import get_db
from app.models.video import Video, VideoStatus, VideoFormat
from app.services.pipeline import run_pipeline, run_pipeline_from_audio, run_pipeline_from_assembly

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["Generate"])


class CreateVideoRequest(BaseModel):
    topic: str = Field(..., description="Sujet ou titre de l'épisode")
    style: str = Field(default="storytelling", description="Style visuel")
    format: VideoFormat = Field(default=VideoFormat.PREMIUM, description="Format de génération")
    serie_id: Optional[str] = Field(default="couple_virilite", description="ID de la série")
    episode_number: int = Field(default=1, description="Numéro de l'épisode")
    previous_summary: Optional[str] = Field(default=None, description="Résumé de l'épisode précédent")


@router.post("/create")
async def create_video(
    request: CreateVideoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Crée une nouvelle vidéo et lance le pipeline."""

    # Auto-récupération du résumé du dernier épisode si non fourni
    previous_summary = request.previous_summary
    if not previous_summary and request.episode_number > 1 and request.serie_id:
        prev_video = (
            db.query(Video)
            .filter(
                Video.serie_id == request.serie_id,
                Video.episode_number == request.episode_number - 1,
                Video.status == VideoStatus.READY
            )
            .first()
        )
        if prev_video and prev_video.previous_summary:
            previous_summary = prev_video.previous_summary
            logger.info(f"Résumé épisode {request.episode_number - 1} récupéré automatiquement")

    video = Video(
        topic=request.topic,
        style=request.style,
        format=request.format,
        serie_id=request.serie_id,
        episode_number=request.episode_number,
        previous_summary=previous_summary,
        status=VideoStatus.DRAFT
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    background_tasks.add_task(run_pipeline, video.id)

    return {
        "message": "Pipeline lancé",
        "video_id": video.id,
        "format": request.format,
        "episode_number": request.episode_number,
        "serie_id": request.serie_id,
        "has_previous_context": bool(previous_summary)
    }


@router.post("/{video_id}")
async def generate_video(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Lance le pipeline complet depuis le début (rétrocompatibilité)."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    if video.status not in [VideoStatus.DRAFT, VideoStatus.FAILED]:
        raise HTTPException(status_code=400, detail="La vidéo est déjà en cours de traitement")
    background_tasks.add_task(run_pipeline, video_id)
    return {"message": "Pipeline lancé depuis le début", "video_id": video_id, "from_step": "script"}


@router.post("/{video_id}/resume")
async def resume_video(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Reprend le pipeline depuis l'étape où il s'est interrompu."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")

    if video.status not in [VideoStatus.FAILED, VideoStatus.DRAFT]:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de reprendre une vidéo avec le statut '{video.status}'"
        )

    has_script = bool(video.script)
    has_images = bool(video.scenes_images and len(video.scenes_images) > 0)
    has_audio  = bool(video.scenes_audio and len(video.scenes_audio) > 0)

    if has_audio and has_images and has_script:
        background_tasks.add_task(run_pipeline_from_assembly, video_id)
        from_step = "assembly"
    elif has_images and has_script:
        background_tasks.add_task(run_pipeline_from_audio, video_id)
        from_step = "audio"
    else:
        background_tasks.add_task(run_pipeline, video_id)
        from_step = "script"

    logger.info(f"Resume vidéo {video_id} depuis étape : {from_step}")
    return {
        "message": f"Pipeline repris depuis l'étape '{from_step}'",
        "video_id": video_id,
        "from_step": from_step,
        "has_script": has_script,
        "has_images": has_images,
        "has_audio": has_audio,
    }