import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.video import Video, VideoStatus
from app.services.pipeline import run_pipeline, run_pipeline_from_audio, run_pipeline_from_assembly

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["Generate"])


@router.post("/{video_id}")
async def generate_video(video_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Lance le pipeline complet depuis le début."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    if video.status not in [VideoStatus.DRAFT, VideoStatus.FAILED]:
        raise HTTPException(status_code=400, detail="La vidéo est déjà en cours de traitement")
    background_tasks.add_task(run_pipeline, video_id)
    return {"message": "Pipeline lancé depuis le début", "video_id": video_id, "from_step": "script"}


@router.post("/{video_id}/resume")
async def resume_video(video_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Reprend le pipeline depuis l'étape où il s'est interrompu :
    - Script + images déjà là → reprend depuis l'audio
    - Script seulement → reprend depuis les images
    - Rien → repart depuis le début
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")

    if video.status not in [VideoStatus.FAILED, VideoStatus.DRAFT]:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de reprendre une vidéo avec le statut '{video.status}'"
        )

    # ── Déterminer depuis quelle étape reprendre ──────────────────
    has_script = bool(video.script)
    has_images = bool(video.scenes_images and len(video.scenes_images) > 0)
    has_audio  = bool(video.scenes_audio and len(video.scenes_audio) > 0)

    if has_images and has_script:
        # Images + script OK → reprendre depuis l'audio
        background_tasks.add_task(run_pipeline_from_audio, video_id)
        from_step = "audio"
    elif has_script:
        # Script OK mais pas d'images → reprendre depuis les images
        background_tasks.add_task(run_pipeline_from_audio, video_id)
        from_step = "images"
    else:
        # Rien de sauvegardé → pipeline complet
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