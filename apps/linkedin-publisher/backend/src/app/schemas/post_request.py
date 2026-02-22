"""
Schémas Pydantic pour les requêtes Posts
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.post import PostStatus, PostType


class PostCreateRequest(BaseModel):
    """Requête pour créer un nouveau post"""
    raw_content: str = Field(
        ...,
        description="Contenu brut du post (votre idée)",
        min_length=10,
        max_length=5000
    )
    post_type: PostType = Field(..., description="Type de post")
    user_id: int = Field(..., description="ID de l'utilisateur")


class PostResponse(BaseModel):
    """Réponse d'un post"""
    id: int
    user_id: int
    raw_content: str
    post_type: PostType
    processed_content: Optional[str] = None
    title: Optional[str] = None
    bullets: Optional[List[str]] = None
    status: PostStatus
    created_at: datetime

    class Config:
        from_attributes = True
