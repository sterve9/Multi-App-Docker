"""
Service Replicate pour générer des images avec Flux
"""
import os
import replicate
from app.core.config import settings


class ReplicateService:
    """Service de génération d'images avec Replicate Flux"""

    def __init__(self):
        if not settings.REPLICATE_API_TOKEN:
            raise RuntimeError("REPLICATE_API_TOKEN manquant")
        os.environ["REPLICATE_API_TOKEN"] = settings.REPLICATE_API_TOKEN

    def generate_image(self, prompt: str, aspect_ratio: str = "16:9") -> str:
        """
        Génère une image avec Flux 1.1 Pro Ultra

        Returns:
            str: URL de l'image générée
        """
        try:
            output = replicate.run(
                "black-forest-labs/flux-1.1-pro-ultra",
                input={
                    "prompt": prompt,
                    "aspect_ratio": aspect_ratio,
                    "output_format": "jpg",
                    "output_quality": 90,
                    "safety_tolerance": 6,
                    "raw": True
                }
            )
            if isinstance(output, list):
                return str(output[0])
            return str(output)

        except Exception as e:
            raise RuntimeError(f"Erreur génération image Replicate: {str(e)}")
