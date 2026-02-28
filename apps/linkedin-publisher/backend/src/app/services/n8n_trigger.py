"""
Service pour déclencher les webhooks N8N
Nouveau rôle : uniquement notifier n8n que le post est prêt à publier
"""
import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class N8NTriggerService:
    """Service pour déclencher les workflows N8N"""

    def __init__(self):
        self.webhook_url = settings.N8N_WEBHOOK_URL

    async def trigger_publish_workflow(
        self,
        post_id: int,
        processed_content: str,
        final_image_path: str,
    ) -> None:
        """
        Notifie n8n que le post est prêt à publier sur LinkedIn.
        Non bloquant — si n8n est indisponible, le post reste en status ready.
        """
        if not self.webhook_url:
            logger.warning("N8N_WEBHOOK_URL non configuré, notification ignorée")
            return

        payload = {
            "post_id":          post_id,
            "processed_content": processed_content,
            "final_image_path": final_image_path,
            "trigger":          "post_ready_to_publish"
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.webhook_url, json=payload)
                response.raise_for_status()
            logger.info(f"N8N notifié pour post {post_id} ✅")
        except Exception as e:
            logger.warning(f"N8N webhook échoué (non bloquant) : {e}")