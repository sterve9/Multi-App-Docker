import logging
import httpx
from app.core.database import SessionLocal
from app.models.video import Video, VideoStatus
from app.services.script import generate_script
from app.services.image import generate_images
from app.services.audio import generate_audio
from app.services.video import assemble_video
from app.services.telegram import notify_video_ready, notify_video_failed
from app.core.config import settings

logger = logging.getLogger(__name__)


async def trigger_n8n_webhook(video_id: int, title: str, description: str, tags: list, video_path: str, thumbnail_path: str = None):
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
                    "thumbnail_path": thumbnail_path,
                    "download_url": f"{settings.BASE_URL}/api/videos/{video_id}/download",
                    "thumbnail_url": f"{settings.BASE_URL}/api/videos/{video_id}/thumbnail" if thumbnail_path else None,
                },
                timeout=30
            )
        logger.info(f"Webhook n8n envoyé pour vidéo {video_id}")
    except Exception as e:
        logger.warning(f"Webhook n8n échoué (non bloquant): {e}")


async def _assemble_and_publish(video_id: int, video, images, audio_files, db):
    """Étapes communes : assemblage FFmpeg + notifications + webhook n8n"""
    video.status = VideoStatus.ASSEMBLING
    db.commit()

    result = await assemble_video(
        video_id=video.id,
        scenes=video.script,
        image_urls=images,
        audio_files=audio_files,
        style=video.style or "storytelling",
        title=video.title or video.topic,
        video_format=video.format or "premium",
    )

    video.final_video_path = result["video_path"]
    if hasattr(video, "thumbnail_path") and result.get("thumbnail_path"):
        video.thumbnail_path = result["thumbnail_path"]
    if hasattr(video, "subtitles_path") and result.get("subtitles_path"):
        video.subtitles_path = result["subtitles_path"]

    video.status = VideoStatus.READY
    db.commit()

    logger.info(f"✅ Pipeline terminé pour vidéo {video_id}")

    await notify_video_ready(
        video_id=video_id,
        title=video.title,
        youtube_url=getattr(video, "youtube_url", None)
    )


async def run_pipeline(video_id: int):
    """Pipeline complet depuis le début."""
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()

        video.status = VideoStatus.SCRIPTING
        db.commit()

        # Générer le script avec contexte épisode
        script_data = await generate_script(
            topic=video.topic,
            style=video.style or "cinematique",
            episode_number=video.episode_number or 1,
            previous_summary=video.previous_summary
        )

        video.title = script_data["title"]
        video.description = script_data["description"]
        video.script = script_data["scenes"]
        video.tags = script_data["tags"]

        # Sauvegarder le résumé de cet épisode pour le suivant
        if script_data.get("episode_summary"):
            video.previous_summary = script_data["episode_summary"]

        db.commit()

        video.status = VideoStatus.GENERATING_IMAGES
        db.commit()

        # Générer les visuels selon le format
        video_format = video.format or "premium"
        images = await generate_images(video.script, format=video_format)
        video.scenes_images = images
        db.commit()

        video.status = VideoStatus.GENERATING_AUDIO
        db.commit()
        audio_files = await generate_audio(video_id, video.script)
        video.scenes_audio = audio_files
        db.commit()

        await _assemble_and_publish(video_id, video, images, audio_files, db)

    except Exception as e:
        logger.error(f"Pipeline échoué pour vidéo {video_id}: {e}")
        video = db.query(Video).filter(Video.id == video_id).first()
        video.status = VideoStatus.FAILED
        video.error_message = str(e)
        db.commit()
        await notify_video_failed(
            video_id=video_id,
            title=getattr(video, "title", None) or getattr(video, "topic", ""),
            error=str(e)
        )
    finally:
        db.close()


async def run_pipeline_from_audio(video_id: int):
    """Reprend depuis l'audio — script + images déjà sauvegardés."""
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()

        if not video.script:
            raise Exception("Script manquant, impossible de reprendre depuis l'audio")
        if not video.scenes_images:
            raise Exception("Images manquantes, impossible de reprendre depuis l'audio")

        logger.info(f"▶ Resume vidéo {video_id} depuis l'audio ({len(video.scenes_images)} images récupérées)")

        images = video.scenes_images
        video.status = VideoStatus.GENERATING_AUDIO
        video.error_message = None
        db.commit()

        audio_files = await generate_audio(video_id, video.script)
        video.scenes_audio = audio_files
        db.commit()

        await _assemble_and_publish(video_id, video, images, audio_files, db)

    except Exception as e:
        logger.error(f"Resume (audio) échoué pour vidéo {video_id}: {e}")
        video = db.query(Video).filter(Video.id == video_id).first()
        video.status = VideoStatus.FAILED
        video.error_message = str(e)
        db.commit()
        await notify_video_failed(
            video_id=video_id,
            title=getattr(video, "title", None) or getattr(video, "topic", ""),
            error=str(e)
        )
    finally:
        db.close()


async def run_pipeline_from_assembly(video_id: int):
    """Reprend depuis l'assemblage — script + images + audio déjà sauvegardés."""
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()

        if not video.script:
            raise Exception("Script manquant")
        if not video.scenes_images:
            raise Exception("Images manquantes")
        if not video.scenes_audio:
            raise Exception("Audio manquant")

        logger.info(f"▶ Resume vidéo {video_id} depuis l'assemblage")

        images = video.scenes_images
        audio_files = video.scenes_audio
        video.error_message = None
        db.commit()

        await _assemble_and_publish(video_id, video, images, audio_files, db)

    except Exception as e:
        logger.error(f"Resume (assembly) échoué pour vidéo {video_id}: {e}")
        video = db.query(Video).filter(Video.id == video_id).first()
        video.status = VideoStatus.FAILED
        video.error_message = str(e)
        db.commit()
        await notify_video_failed(
            video_id=video_id,
            title=getattr(video, "title", None) or getattr(video, "topic", ""),
            error=str(e)
        )
    finally:
        db.close()