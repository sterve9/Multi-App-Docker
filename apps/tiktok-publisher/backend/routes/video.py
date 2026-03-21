from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from models.db_video import Video

router = APIRouter()


@router.get("/videos")
async def list_videos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Video).order_by(Video.created_at.desc()))
    videos = result.scalars().all()
    return [_serialize(v) for v in videos]


@router.get("/videos/{video_id}")
async def get_video(video_id: str, db: AsyncSession = Depends(get_db)):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return _serialize(video)


@router.delete("/videos/{video_id}")
async def delete_video(video_id: str, db: AsyncSession = Depends(get_db)):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    await db.delete(video)
    await db.commit()
    return {"ok": True}


def _serialize(v: Video) -> dict:
    return {
        "id": v.id,
        "title": v.title,
        "script": v.script,
        "duration_seconds": v.duration_seconds,
        "audio_path": v.audio_path,
        "video_path": v.video_path,
        "status": v.status,
        "error_message": v.error_message,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }
