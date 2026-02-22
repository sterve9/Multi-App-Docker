"""
Configuration centralisée de l'application
Charge les variables d'environnement et définit les settings
"""
import os
from dotenv import load_dotenv

load_dotenv()


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
    
    # Images
    IMAGE_OUTPUT_DIR: str = "/app/outputs/images"
    MAX_IMAGE_SIZE_MB: int = 10


settings = Settings()
