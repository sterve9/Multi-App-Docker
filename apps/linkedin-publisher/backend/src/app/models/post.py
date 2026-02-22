"""
Modèle Post - Posts LinkedIn
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class LinkedInPost(Base):
    """
    Table linkedin_posts
    Stocke tous les posts LinkedIn
    """
    __tablename__ = "linkedin_posts"

    id = Column(Integer, primary_key=True, index=True)
    
    # Relation
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Contenu brut
    raw_content = Column(Text, nullable=False)
    post_type = Column(String(50), nullable=False)  # milestone, update, learning
    
    # Contenu traité par Claude
    processed_content = Column(Text, nullable=True)
    title = Column(String(255), nullable=True)
    bullet1 = Column(String(255), nullable=True)
    bullet2 = Column(String(255), nullable=True)
    bullet3 = Column(String(255), nullable=True)
    
    # Images
    image_prompt = Column(Text, nullable=True)
    replicate_image_url = Column(String(500), nullable=True)
    final_image_path = Column(String(500), nullable=True)
    
    # Publication
    status = Column(String(50), default="draft")  # draft, processing, ready, published, failed
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    
    # IDs externes
    buffer_post_id = Column(String(255), nullable=True)
    linkedin_post_id = Column(String(255), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
