import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_telegram(message: str) -> None:
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


async def notify_lead_ready(lead_id: int, name: str, priority: str, category: str) -> None:
    emoji = "🔥" if priority == "high" else "📋" if priority == "medium" else "📌"
    message = (
        f"{emoji} <b>Nouveau lead traité !</b>\n"
        f"👤 <b>Nom :</b> {name}\n"
        f"🆔 <b>ID :</b> {lead_id}\n"
        f"⚡ <b>Priorité :</b> {priority}\n"
        f"📂 <b>Catégorie :</b> {category}\n"
        f"🔗 <b>Dashboard :</b> https://sterveshop.cloud/admin"
    )
    await send_telegram(message)


async def notify_lead_failed(lead_id: int, error: str) -> None:
    message = (
        f"❌ <b>Pipeline lead échoué</b>\n"
        f"🆔 <b>ID :</b> {lead_id}\n"
        f"⚠️ <b>Erreur :</b> <code>{error[:300]}</code>"
    )
    await send_telegram(message)
