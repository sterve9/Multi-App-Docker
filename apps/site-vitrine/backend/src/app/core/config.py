import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ===============================
    # APP
    # ===============================
    APP_NAME: str = "Site Vitrine API"
    ENV: str = os.getenv("ENV", "development")

    # ===============================
    # DATABASE
    # ===============================
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "sterveshop")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "postgres")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"postgresql+psycopg2://{os.getenv('POSTGRES_USER', 'postgres')}:{os.getenv('POSTGRES_PASSWORD', 'postgres')}@{os.getenv('POSTGRES_HOST', 'postgres')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'sterveshop')}"
    )

    # ===============================
    # EXTERNAL SERVICES
    # ===============================
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")
    N8N_WEBHOOK_URL: str | None = os.getenv("N8N_WEBHOOK_URL")

    # ===============================
    # TELEGRAM
    # ===============================
    TELEGRAM_BOT_TOKEN: str | None = os.getenv("TELEGRAM_BOT_TOKEN")
    TELEGRAM_CHAT_ID: str | None = os.getenv("TELEGRAM_CHAT_ID")


settings = Settings()