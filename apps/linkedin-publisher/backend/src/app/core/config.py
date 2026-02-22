"""
Configuration centralisée de l'application
Charge les variables d'environnement et définit les settings
"""
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class Settings:
    """Settings de l'application"""

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/linkedin_publisher"
    )

    # API Keys
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    REPLICATE_API_TOKEN: str = os.getenv("REPLICATE_API_TOKEN", "")

    # N8N
    N8N_WEBHOOK_URL: str = os.getenv("N8N_WEBHOOK_URL", "")

    # App
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    APP_NAME: str = "LinkedIn Publisher API"
    VERSION: str = "1.0.0"

    # CORS
    ALLOWED_ORIGINS: list = []

    # Images
    IMAGE_OUTPUT_DIR: str = "/app/outputs/images"
    MAX_IMAGE_SIZE_MB: int = 10

    def validate(self):
        """Vérifie que les variables critiques sont présentes"""
        missing = []
        if not self.ANTHROPIC_API_KEY:
            missing.append("ANTHROPIC_API_KEY")
        if not self.REPLICATE_API_TOKEN:
            missing.append("REPLICATE_API_TOKEN")
        if not self.N8N_WEBHOOK_URL:
            missing.append("N8N_WEBHOOK_URL")
        if missing:
            logger.warning(f"Variables d'environnement manquantes : {', '.join(missing)}")


settings = Settings()
settings.validate()
