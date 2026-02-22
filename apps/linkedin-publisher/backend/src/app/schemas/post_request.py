"""
Schémas Pydantic pour les requêtes Posts
"""
from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


class PostCreateRequest(BaseModel):
    """
    Requête pour créer un nouveau post
    """
    raw_content: str = Field(
        ...,
        description="Contenu brut du post (votre idée)",
        min_length=10,
        max_length=5000
    )
    post_type: Literal["milestone", "update", "learning"] = Field(
        ...,
        description="Type de post"
    )
    user_id: int = Field(..., description="ID de l'utilisateur")


class PostResponse(BaseModel):
    """
    Réponse d'un post
    """
    id: int
    user_id: int
    raw_content: str
    post_type: str
    processed_content: Optional[str]
    title: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
