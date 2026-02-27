import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class VideoStatus(str, enum.Enum):
    DRAFT             = "draft"
    SCRIPTING         = "scripting"
    GENERATING_IMAGES = "generating_images"
    GENERATING_AUDIO  = "generating_audio"
    ASSEMBLING        = "assembling"
    READY             = "ready"
    UPLOADING         = "uploading"
    PUBLISHED         = "published"
    FAILED            = "failed"


class Video(Base):
    __tablename__ = "videos"

    id          = Column(Integer, primary_key=True, index=True)
    topic       = Column(String(500), nullable=False)
    style       = Column(String(100), default="cinematique")
    title       = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    script      = Column(JSON, nullable=True)
    tags        = Column(JSON, nullable=True)
    status      = Column(Enum(VideoStatus), default=VideoStatus.DRAFT)
    error_message     = Column(Text, nullable=True)
    scenes_images     = Column(JSON, nullable=True)
    scenes_audio      = Column(JSON, nullable=True)
    final_video_path  = Column(String(500), nullable=True)
    thumbnail_path    = Column(String(500), nullable=True)
    subtitles_path    = Column(String(500), nullable=True)
    youtube_url       = Column(String(500), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())