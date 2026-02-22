"""
Service pour déclencher les webhooks N8N
"""
import httpx
from app.core.config import settings


class N8NTriggerService:
    """
    Service pour déclencher les workflows N8N
    """
    
    def __init__(self):
        if not settings.N8N_WEBHOOK_URL:
            raise RuntimeError("N8N_WEBHOOK_URL manquant")
        
        self.webhook_url = settings.N8N_WEBHOOK_URL
    
    async def trigger_post_workflow(self, post_id: int, user_id: int) -> dict:
        """
        Déclenche le workflow N8N pour traiter un post
        
        Args:
            post_id: ID du post créé
            user_id: ID de l'utilisateur
        
        Returns:
            dict: Réponse du webhook N8N
        """
        
        payload = {
            "post_id": post_id,
            "user_id": user_id,
            "trigger": "new_post_created"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    self.webhook_url,
                    json=payload
                )
                response.raise_for_status()
                return response.json()
            
            except httpx.HTTPError as e:
                raise RuntimeError(f"Erreur N8N webhook: {str(e)}")
