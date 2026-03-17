import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class Settings:
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@linkedin-db:5432/linkedin_publisher"
    )

    # API Keys
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    KIE_AI_API_KEY: str    = os.getenv("KIE_AI_API_KEY", "")

    # N8N
    N8N_WEBHOOK_URL: str = os.getenv("N8N_WEBHOOK_URL", "")

    # Telegram
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str   = os.getenv("TELEGRAM_CHAT_ID", "")

    # App
    DEBUG: bool     = os.getenv("DEBUG", "False").lower() == "true"
    APP_NAME: str   = "LinkedIn Publisher API"
    VERSION: str    = "2.0.0"
    BASE_URL: str   = os.getenv("BASE_URL", "https://api.linkedin.sterveshop.cloud")

    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "https://app.linkedin.sterveshop.cloud",
    ]

    # Paths
    IMAGE_OUTPUT_DIR: str     = "/app/outputs/images"
    REFERENCE_PHOTO_PATH: str = os.getenv("REFERENCE_PHOTO_PATH", "/app/assets/reference/photo.jpg")

    def validate(self):
        missing = []
        if not self.ANTHROPIC_API_KEY: missing.append("ANTHROPIC_API_KEY")
        if not self.KIE_AI_API_KEY:    missing.append("KIE_AI_API_KEY")
        if not self.N8N_WEBHOOK_URL:   missing.append("N8N_WEBHOOK_URL")
        if missing:
            logger.warning(f"Variables manquantes : {', '.join(missing)}")


settings = Settings()
settings.validate()
