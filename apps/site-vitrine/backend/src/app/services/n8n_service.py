"""
Service n8n — nouveau rôle : uniquement envoyer l'email généré par Claude
"""
import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


async def trigger_n8n_webhook(payload: dict) -> None:
    """
    Envoie à n8n le contenu email prêt à envoyer.
    Non bloquant — si n8n est indisponible, le lead est quand même sauvegardé.
    """
    if not settings.N8N_WEBHOOK_URL:
        logger.warning("N8N_WEBHOOK_URL non configuré, notification ignorée")
        return

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(settings.N8N_WEBHOOK_URL, json=payload)
            response.raise_for_status()
        logger.info(f"N8N notifié pour lead {payload.get('lead_id')} ✅")
    except Exception as e:
        logger.warning(f"N8N webhook échoué (non bloquant) : {e}")