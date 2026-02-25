import logging
import httpx
from app.core.database import SessionLocal
from app.models.video import Video, VideoStatus
from app.services.script import generate_script
from app.services.image import generate_images
from app.services.audio import generate_audio
from app.services.video import assemble_video
from app.core.config import settings

logger = logging.getLogger(__name__)

async def trigger_n8n_webhook(video_id: int, title: str, description: str, tags: list, video_path: str):
    if not settings.N8N_WEBHOOK_URL:
        logger.warning("N8N_WEBHOOK_URL non configuré, webhook ignoré")
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                settings.N8N_WEBHOOK_URL,
                json={
                    "video_id": video_id,
                    "title": title,
                    "description": description,
                    "tags": tags,
                    "video_path": video_path,
                    "download_url": f"https://api.youtube.sterveshop.cloud/api/videos/{video_id}/download"
                },
                timeout=30
            )
        logger.info(f"Webhook n8n envoyé pour vidéo {video_id}")
    except Exception as e:
        logger.warning(f"Webhook n8n échoué (non bloquant): {e}")

async def run_pipeline(video_id: int):
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()

        # Étape 1 - Script
        video.status = VideoStatus.SCRIPTING
        db.commit()
        script_data = await generate_script(video.topic, video.style)
        video.title = script_data["title"]
        video.description = script_data["description"]
        video.script = script_data["scenes"]
        video.tags = script_data["tags"]
        db.commit()

        # Étape 2 - Images
        video.status = VideoStatus.GENERATING_IMAGES
        db.commit()
        images = await generate_images(video.script)
        video.scenes_images = images
        db.commit()

        # Étape 3 - Audio
        video.status = VideoStatus.GENERATING_AUDIO
        db.commit()
        audio_files = await generate_audio(video_id, video.script)
        video.scenes_audio = audio_files
        db.commit()

        # Étape 4 - Assemblage
        video.status = VideoStatus.ASSEMBLING
        db.commit()
        video_path = await assemble_video(video.id, video.script, images, audio_files)
        video.final_video_path = video_path
        video.status = VideoStatus.READY
        db.commit()

        logger.info(f"Pipeline terminé pour vidéo {video_id}")

        # Étape 5 - Webhook n8n
        await trigger_n8n_webhook(
            video_id=video_id,
            title=video.title,
            description=video.description,
            tags=video.tags or [],
            video_path=video_path
        )

    except Exception as e:
        logger.error(f"Pipeline échoué pour vidéo {video_id}: {e}")
        video.status = VideoStatus.FAILED
        video.error_message = str(e)
        db.commit()
    finally:
        db.close()
