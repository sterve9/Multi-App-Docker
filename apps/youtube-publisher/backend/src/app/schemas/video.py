from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.video import VideoStatus

class SceneSchema(BaseModel):
    scene_number: int
    narration: str
    image_prompt: str
    duration_seconds: int = 20

class VideoCreateRequest(BaseModel):
    topic: str = Field(..., min_length=10, max_length=500, description="Sujet ou titre de l'histoire")
    style: str = Field(default="cinematique", description="Style visuel des images")

class VideoResponse(BaseModel):
    id: int
    topic: str
    style: str
    title: Optional[str] = None
    description: Optional[str] = None
    script: Optional[List[dict]] = None
    tags: Optional[List[str]] = None
    scenes_images: Optional[List[str]] = None
    final_video_path: Optional[str] = None
    youtube_url: Optional[str] = None
    status: VideoStatus
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
