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


async def notify_post_ready(post_id: int, title: str) -> None:
    message = (
        f"✅ <b>Post LinkedIn prêt !</b>\n"
        f"📌 <b>Titre :</b> {title}\n"
        f"🆔 <b>ID :</b> {post_id}\n"
        f"🔗 <b>Dashboard :</b> https://app.linkedin.sterveshop.cloud"
    )
    await send_telegram(message)


async def notify_post_failed(post_id: int, error: str) -> None:
    message = (
        f"❌ <b>Post LinkedIn échoué</b>\n"
        f"🆔 <b>ID :</b> {post_id}\n"
        f"⚠️ <b>Erreur :</b> <code>{error[:300]}</code>"
    )
    await send_telegram(message)
