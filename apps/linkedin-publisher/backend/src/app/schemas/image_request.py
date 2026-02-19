"""
Schémas Pydantic pour les requêtes Images
"""
from pydantic import BaseModel, HttpUrl, Field


class ImageOverlayRequest(BaseModel):
    """
    Requête pour ajouter un overlay sur une image
    """
    image_url: HttpUrl = Field(..., description="URL de l'image de base")
    title: str = Field(..., min_length=1, max_length=100)
    bullet1: str = Field(..., min_length=1, max_length=150)
    bullet2: str = Field(..., min_length=1, max_length=150)
    bullet3: str = Field(..., min_length=1, max_length=150)


class ImageOverlayResponse(BaseModel):
    """
    Réponse après génération d'overlay
    """
    success: bool
    output_path: str
    download_url: str
