import httpx
import os

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")


async def trigger_n8n_webhook(payload: dict):
    if not N8N_WEBHOOK_URL:
        raise RuntimeError("N8N_WEBHOOK_URL manquante")

    async with httpx.AsyncClient() as client:
        response = await client.post(N8N_WEBHOOK_URL, json=payload)
        response.raise_for_status()
