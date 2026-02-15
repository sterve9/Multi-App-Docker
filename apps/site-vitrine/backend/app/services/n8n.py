"""
Service n8n via Webhooks
Alternative à l'API qui retourne 401
"""

import httpx
import os
from dotenv import load_dotenv
from typing import Dict

load_dotenv()

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")

async def trigger_n8n_webhook(data: Dict) -> Dict:
    """
    Déclenche un workflow n8n via webhook

    Args:
        data: Données à envoyer au workflow

    Returns:
        Réponse du webhook n8n
    """
    if not N8N_WEBHOOK_URL:
        raise ValueError("N8N_WEBHOOK_URL manquante dans .env")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                N8N_WEBHOOK_URL,
                json=data
            )
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        print(f"❌ Erreur HTTP webhook n8n: {e.response.status_code}")
        print(f"Réponse: {e.response.text}")
        raise
    except Exception as e:
        print(f"❌ Erreur webhook n8n: {e}")
        raise


async def test_webhook_connection() -> bool:
    """Teste la connexion au webhook n8n"""
    try:
        test_data = {
            "test": True,
            "client": {
                "name": "Test Connection",
                "email": "test@test.com",
                "message": "Testing webhook"
            },
            "analysis": {
                "category": "test",
                "priority": "low",
                "summary": "Test"
            }
        }

        result = await trigger_n8n_webhook(test_data)
        print("✅ Webhook n8n accessible !")
        print(f"Réponse: {result}")
        return True

    except Exception as e:
        print(f"❌ Webhook n8n inaccessible: {e}")
        return False
