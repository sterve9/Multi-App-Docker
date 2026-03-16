import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_telegram(message: str) -> None:
    """Envoie une notification Telegram — non bloquant si erreur"""
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.warning("Telegram non configuré, notification ignorée")
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "HTML"
                },
                timeout=10
            )
        logger.info("Notification Telegram envoyée ✅")
    except Exception as e:
        logger.warning(f"Notification Telegram échouée (non bloquant) : {e}")


async def notify_video_ready(video_id: int, title: str, youtube_url: str = None) -> None:
    lines = [
        "✅ <b>Vidéo prête !</b>",
        f"🎬 <b>Titre :</b> {title}",
        f"🆔 <b>ID :</b> {video_id}",
    ]
    if youtube_url:
        lines.append(f"▶️ <b>YouTube :</b> {youtube_url}")
    else:
        lines.append(f"📥 <b>Download :</b> {settings.BASE_URL}/api/videos/{video_id}/download")
    await send_telegram("\n".join(lines))


async def notify_video_failed(video_id: int, title: str, error: str) -> None:
    message = (
        f"❌ <b>Pipeline échoué</b>\n"
        f"🎬 <b>Titre :</b> {title or 'Sans titre'}\n"
        f"🆔 <b>ID :</b> {video_id}\n"
        f"⚠️ <b>Erreur :</b> <code>{error[:300]}</code>"
    )
    await send_telegram(message)
