import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class VideoStatus(str, enum.Enum):
    DRAFT             = "DRAFT"
    SCRIPTING         = "SCRIPTING"
    GENERATING_IMAGES = "GENERATING_IMAGES"
    GENERATING_AUDIO  = "GENERATING_AUDIO"
    ASSEMBLING        = "ASSEMBLING"
    READY             = "READY"
    UPLOADING         = "UPLOADING"
    PUBLISHED         = "PUBLISHED"
    FAILED            = "FAILED"


class VideoFormat(str, enum.Enum):
    ECONOMIQUE = "economique"   # Images animées Ken Burns + sous-titres
    PREMIUM    = "premium"      # Vidéo IA Kling avec image reference


class Video(Base):
    __tablename__ = "videos"

    id                = Column(Integer, primary_key=True, index=True)
    topic             = Column(String(500), nullable=False)
    style             = Column(String(100), default="cinematique")
    format            = Column(Enum(VideoFormat), default=VideoFormat.PREMIUM)

    # Série & épisode
    serie_id          = Column(String(100), nullable=True)   # ex: "couple_virilite"
    episode_number    = Column(Integer, default=1)
    previous_summary  = Column(Text, nullable=True)          # résumé épisode précédent

    # Métadonnées générées
    title             = Column(String(500), nullable=True)
    description       = Column(Text, nullable=True)
    script            = Column(JSON, nullable=True)
    tags              = Column(JSON, nullable=True)

    # Statut
    status            = Column(Enum(VideoStatus), default=VideoStatus.DRAFT)
    error_message     = Column(Text, nullable=True)

    # Assets générés
    scenes_images     = Column(JSON, nullable=True)   # URLs ou chemins locaux
    scenes_audio      = Column(JSON, nullable=True)   # chemins MP3
    final_video_path  = Column(String(500), nullable=True)
    thumbnail_path    = Column(String(500), nullable=True)
    subtitles_path    = Column(String(500), nullable=True)
    youtube_url       = Column(String(500), nullable=True)
    youtube_video_id  = Column(String(200), nullable=True)

    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())