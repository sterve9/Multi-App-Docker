from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import ARRAY
from core.database import Base
from datetime import datetime

class VideoJob(Base):
    __tablename__ = "video_jobs"

    video_id    = Column(String, primary_key=True)
    status      = Column(String, default="pending")
    progress    = Column(Integer, default=0)
    message     = Column(String, default="")
    video_url   = Column(String, nullable=True)
    script      = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    tags        = Column(ARRAY(String), nullable=True)
    format      = Column(String, nullable=True)
    duration    = Column(String, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
