from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str
    ELEVENLABS_API_KEY: str
    ELEVENLABS_VOICE_ID: str
    BASE_URL: str = "https://api.tiktok.sterveshop.cloud"

    class Config:
        env_file = ".env"


settings = Settings()
