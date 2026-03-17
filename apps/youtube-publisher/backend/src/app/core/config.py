from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "YouTube Publisher API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    DATABASE_URL: str
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://app.youtube.sterveshop.cloud",
    ]
    ANTHROPIC_API_KEY: str
    KIE_AI_API_KEY: str
    ELEVENLABS_API_KEY: str
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"
    N8N_WEBHOOK_URL: str = ""
    YOUTUBE_CLIENT_ID: str = ""
    YOUTUBE_CLIENT_SECRET: str = ""
    YOUTUBE_REFRESH_TOKEN: str = ""
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    BASE_URL: str = "https://api.youtube.sterveshop.cloud"
    AFFILIATE_LINK: str = "https://rituel.sterveshop.cloud"
    REMOTION_SERVICE_URL: str = ""

    class Config:
        env_file = ".env"

settings = Settings()