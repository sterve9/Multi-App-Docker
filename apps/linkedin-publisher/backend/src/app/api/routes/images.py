"""
Routes API pour la génération et le traitement d'images
"""
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from app.schemas.image_request import ImageOverlayRequest, ImageOverlayResponse
from app.services.image_overlay import ImageOverlayService
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["Images"])
image_service = ImageOverlayService()


@router.post("/overlay", response_model=ImageOverlayResponse)
async def create_overlay(payload: ImageOverlayRequest):
    """Ajoute un overlay professionnel sur une image avec titre et bullet points"""
    try:
        output_path = image_service.create_linkedin_overlay(
            image_url=str(payload.image_url),
            title=payload.title,
            bullets=payload.bullets
        )

        filename = Path(output_path).name

        return ImageOverlayResponse(
            success=True,
            output_path=output_path,
            download_url=f"/api/images/download/{filename}"
        )

    except Exception as e:
        logger.error(f"Overlay generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur génération overlay: {str(e)}")


@router.get("/download/{filename}")
async def download_image(filename: str):
    """Télécharger une image générée"""
    file_path = Path(settings.IMAGE_OUTPUT_DIR) / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    # Sécurité : protection path traversal
    if not str(file_path.resolve()).startswith(settings.IMAGE_OUTPUT_DIR):
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(
        path=file_path,
        media_type="image/jpeg",
        filename=filename
    )
