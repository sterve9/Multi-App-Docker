from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, field_validator
from core.database import get_db
from models.db_video import Video, VideoStatus
from services.claude_service import generate_script
from services.elevenlabs_service import generate_voice
from services.remotion_service import render_video

router = APIRouter()

ALLOWED_DURATIONS = [60, 90, 120]


class GenerateRequest(BaseModel):
    title: str
    topic: str
    duration_seconds: int = 60

    @field_validator("duration_seconds")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v not in ALLOWED_DURATIONS:
            raise ValueError(f"Durée invalide. Valeurs acceptées : {ALLOWED_DURATIONS}")
        return v


@router.post("/generate")
async def generate_video(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    video = Video(
        title=request.title,
        duration_seconds=request.duration_seconds,
        status=VideoStatus.DRAFT,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)

    background_tasks.add_task(
        _run_pipeline,
        video.id,
        request.topic,
        request.duration_seconds,
    )

    return {"id": video.id, "status": video.status}


async def _run_pipeline(video_id: str, topic: str, duration_seconds: int):
    from core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        video = await db.get(Video, video_id)
        try:
            video.status = VideoStatus.GENERATING
            await db.commit()

            # 1. Générer le script avec Claude
            script = await generate_script(topic, duration_seconds)
            video.script = script
            await db.commit()

            # 2. Générer la voix clonée avec ElevenLabs
            audio_path = await generate_voice(video_id, script)
            video.audio_path = audio_path
            await db.commit()

            # 3. Rendu vidéo Remotion avec l'audio
            video_path = await render_video(video_id, script, audio_path, duration_seconds)
            video.video_path = video_path
            video.status = VideoStatus.READY

        except Exception as e:
            video.status = VideoStatus.FAILED
            video.error_message = str(e)

        await db.commit()
