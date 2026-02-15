from fastapi import APIRouter, HTTPException
from datetime import datetime

from app.schemas.contact import ContactRequest
from app.services.claude import analyze_with_claude
from app.services.n8n import trigger_n8n_webhook

router = APIRouter(
    prefix="/api/contact",
    tags=["Contact"]
)

@router.post("")
async def receive_contact(contact: ContactRequest):
    try:
        analysis = await analyze_with_claude(contact)

        payload = {
            "client": contact.dict(),
            "analysis": analysis,
            "timestamp": datetime.utcnow().isoformat()
        }

        try:
            await trigger_n8n_webhook(payload)
            n8n_triggered = True
        except Exception as e:
            print("⚠️ n8n webhook error:", e)
            n8n_triggered = False

        return {
            "success": True,
            "analysis": analysis,
            "n8n_triggered": n8n_triggered
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
