from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

class ScriptRequest(BaseModel):
    theme: str
    format: Literal["image_animee", "video_ia"]
    duration: Literal["15", "30", "60"]
    langue: str = "fr"

class ScriptResponse(BaseModel):
    script: str
    captions: list[str]
    tags: list[str]
    description: str
    hook: str
    sales_text: str = ""

class VideoGenerationRequest(BaseModel):
    script: str
    captions: list[str]
    tags: list[str]
    description: str
    hook: str
    sales_text: str = ""
    format: Literal["image_animee", "video_ia"]
    duration: Literal["15", "30", "60"]

class VideoStatus(BaseModel):
    video_id: str
    status: Literal["pending", "processing", "done", "error"]
    progress: int = 0
    message: str = ""
    video_url: Optional[str] = None
    created_at: datetime = datetime.now()

class PublishRequest(BaseModel):
    video_id: str
    description: str
    tags: list[str]
