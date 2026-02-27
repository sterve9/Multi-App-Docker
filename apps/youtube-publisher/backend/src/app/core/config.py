from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "YouTube Publisher API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    DATABASE_URL: str
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    ANTHROPIC_API_KEY: str
    REPLICATE_API_TOKEN: str
    ELEVENLABS_API_KEY: str
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"
    N8N_WEBHOOK_URL: str = ""
    YOUTUBE_CLIENT_ID: str = ""
    YOUTUBE_CLIENT_SECRET: str = ""
    YOUTUBE_REFRESH_TOKEN: str = ""
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    class Config:
        env_file = ".env"

settings = Settings()