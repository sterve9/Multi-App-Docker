"""
Schémas Pydantic pour les requêtes Images
"""
from pydantic import BaseModel, HttpUrl, Field
from typing import List


class ImageOverlayRequest(BaseModel):
    """Requête pour ajouter un overlay sur une image"""
    image_url: HttpUrl = Field(..., description="URL de l'image de base")
    title: str = Field(..., min_length=1, max_length=100)
    bullets: List[str] = Field(
        ...,
        min_length=1,
        max_length=3,
        description="Liste de 1 à 3 bullet points"
    )


class ImageOverlayResponse(BaseModel):
    """Réponse après génération d'overlay"""
    success: bool
    output_path: str
    download_url: str
