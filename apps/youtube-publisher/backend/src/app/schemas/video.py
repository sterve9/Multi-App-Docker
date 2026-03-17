from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.video import VideoStatus, VideoFormat

class SceneSchema(BaseModel):
    scene_number: int
    narration: str
    image_prompt: str
    duration_seconds: int = 20

class VideoCreateRequest(BaseModel):
    topic: str = Field(..., min_length=10, max_length=500, description="Sujet ou titre de l'histoire")
    style: str = Field(default="cinematique", description="Style visuel des images")
    format: VideoFormat = Field(default=VideoFormat.PREMIUM, description="Format de génération")
    serie_id: Optional[str] = Field(default=None, description="ID de la série")
    episode_number: int = Field(default=1, description="Numéro d'épisode")
    previous_summary: Optional[str] = Field(default=None, description="Résumé de l'épisode précédent")

class VideoPatchRequest(BaseModel):
    youtube_url: Optional[str] = None
    youtube_video_id: Optional[str] = None
    status: Optional[VideoStatus] = None

class VideoResponse(BaseModel):
    id: int
    topic: str
    style: str
    format: VideoFormat
    serie_id: Optional[str] = None
    episode_number: int
    title: Optional[str] = None
    description: Optional[str] = None
    script: Optional[List[dict]] = None
    tags: Optional[List[str]] = None
    scenes_images: Optional[List[str]] = None
    final_video_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    youtube_url: Optional[str] = None
    youtube_video_id: Optional[str] = None
    status: VideoStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
