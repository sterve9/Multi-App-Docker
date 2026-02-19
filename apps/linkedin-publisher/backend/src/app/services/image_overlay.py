"""
Service d'overlay de texte sur images avec PIL
"""
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO
import uuid
from pathlib import Path
from app.core.config import settings


class ImageOverlayService:
    """
    Service pour ajouter des overlays texte professionnels sur des images
    """
    
    def __init__(self):
        self.output_dir = Path(settings.IMAGE_OUTPUT_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def create_linkedin_overlay(
        self,
        image_url: str,
        title: str,
        bullet1: str,
        bullet2: str,
        bullet3: str
    ) -> str:
        """
        Crée une image LinkedIn avec overlay professionnel
        
        Args:
            image_url: URL de l'image de base (depuis Replicate)
            title: Titre du post
            bullet1, bullet2, bullet3: Les 3 points clés
        
        Returns:
            str: Chemin local de l'image finale
        """
        
        # 1. Télécharger l'image
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content)).convert('RGBA')
        
        # 2. Créer un calque overlay transparent
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        # 3. Bande sombre en bas (style LinkedIn professionnel)
        bar_height = 300
        draw.rectangle(
            [(0, img.height - bar_height), (img.width, img.height)],
            fill=(0, 0, 0, 180)  # Noir à 70% d'opacité
        )
        
        # 4. Charger les fonts
        try:
            font_title = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 
                60
            )
            font_bullet = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 
                40
            )
        except OSError:
            # Fallback si fonts pas trouvées
            font_title = ImageFont.load_default()
            font_bullet = ImageFont.load_default()
        
        # 5. Ajouter le titre
        title_y = img.height - 280
        
        # Ombre pour le titre (lisibilité)
        draw.text(
            (52, title_y + 2),
            title,
            font=font_title,
            fill=(0, 0, 0, 150)
        )
        # Titre en blanc
        draw.text(
            (50, title_y),
            title,
            font=font_title,
            fill=(255, 255, 255, 255)
        )
        
        # 6. Ajouter les 3 bullets
        y_position = img.height - 200
        bullets = [bullet1, bullet2, bullet3]
        
        for bullet in bullets:
            if bullet:  # Seulement si le bullet existe
                # Ombre
                draw.text(
                    (72, y_position + 2),
                    f"• {bullet}",
                    font=font_bullet,
                    fill=(0, 0, 0, 150)
                )
                # Texte blanc
                draw.text(
                    (70, y_position),
                    f"• {bullet}",
                    font=font_bullet,
                    fill=(255, 255, 255, 255)
                )
                y_position += 60
        
        # 7. Fusionner les calques
        final_img = Image.alpha_composite(img, overlay).convert('RGB')
        
        # 8. Sauvegarder
        filename = f"linkedin_post_{uuid.uuid4().hex[:8]}.jpg"
        output_path = self.output_dir / filename
        final_img.save(output_path, 'JPEG', quality=95, optimize=True)
        
        return str(output_path)
