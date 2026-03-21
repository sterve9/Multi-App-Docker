import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Integer, Enum as SAEnum
from core.database import Base


class VideoStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    GENERATING = "GENERATING"
    READY = "READY"
    FAILED = "FAILED"


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    topic = Column(Text, nullable=True)
    script = Column(Text, nullable=True)
    duration_seconds = Column(Integer, default=60, nullable=False)
    audio_path = Column(String, nullable=True)
    video_path = Column(String, nullable=True)
    status = Column(SAEnum(VideoStatus), default=VideoStatus.DRAFT, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
