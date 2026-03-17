import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.sql import func
from app.core.database import Base


class PostStatus(str, enum.Enum):
    draft      = "draft"
    processing = "processing"
    ready      = "ready"
    uploading  = "uploading"
    published  = "published"
    failed     = "failed"


class Post(Base):
    __tablename__ = "posts"

    id    = Column(Integer, primary_key=True, index=True)
    topic = Column(Text, nullable=False)

    # Contenu généré par Claude
    hook              = Column(Text, nullable=True)
    reflection        = Column(Text, nullable=True)
    image_prompt      = Column(Text, nullable=True)
    processed_content = Column(Text, nullable=True)  # texte final pour LinkedIn

    # Image
    image_filename = Column(String(255), nullable=True)  # fichier local dans /app/outputs/images/

    # Pipeline
    status        = Column(Enum(PostStatus), default=PostStatus.draft, nullable=False)
    error_message = Column(Text, nullable=True)

    # Publication
    linkedin_post_id = Column(String(255), nullable=True)
    published_at     = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
