"""
Service d'overlay de texte sur images avec PIL
"""
import logging
import uuid
import requests
from io import BytesIO
from pathlib import Path
from typing import List

from PIL import Image, ImageDraw, ImageFont
from app.core.config import settings

logger = logging.getLogger(__name__)


class ImageOverlayService:
    """Service pour ajouter des overlays texte professionnels sur des images"""

    def __init__(self):
        self.output_dir = Path(settings.IMAGE_OUTPUT_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def create_linkedin_overlay(
        self,
        image_url: str,
        title: str,
        bullets: List[str]
    ) -> str:
        """
        Crée une image LinkedIn avec overlay professionnel

        Args:
            image_url: URL de l'image de base
            title: Titre du post
            bullets: Liste de 1 à 3 bullet points

        Returns:
            str: Chemin local de l'image finale
        """
        # 1. Télécharger l'image
        try:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            raise RuntimeError(f"Impossible de télécharger l'image: {str(e)}")

        img = Image.open(BytesIO(response.content)).convert('RGBA')

        # 2. Créer le calque overlay
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # 3. Bande sombre en bas
        bar_height = 300
        draw.rectangle(
            [(0, img.height - bar_height), (img.width, img.height)],
            fill=(0, 0, 0, 180)
        )

        # 4. Charger les fonts
        try:
            font_title = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60
            )
            font_bullet = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40
            )
        except OSError:
            logger.warning("Fonts DejaVu non trouvées, utilisation du fallback")
            font_title = ImageFont.load_default()
            font_bullet = ImageFont.load_default()

        # 5. Titre avec ombre
        title_y = img.height - 280
        draw.text((52, title_y + 2), title, font=font_title, fill=(0, 0, 0, 150))
        draw.text((50, title_y), title, font=font_title, fill=(255, 255, 255, 255))

        # 6. Bullets avec ombre
        y_position = img.height - 200
        for bullet in bullets[:3]:
            if bullet:
                draw.text((72, y_position + 2), f"• {bullet}", font=font_bullet, fill=(0, 0, 0, 150))
                draw.text((70, y_position), f"• {bullet}", font=font_bullet, fill=(255, 255, 255, 255))
                y_position += 60

        # 7. Fusionner et sauvegarder
        final_img = Image.alpha_composite(img, overlay).convert('RGB')
        filename = f"linkedin_post_{uuid.uuid4().hex[:8]}.jpg"
        output_path = self.output_dir / filename
        final_img.save(output_path, 'JPEG', quality=95, optimize=True)

        logger.info(f"Image générée : {output_path}")
        return str(output_path)
