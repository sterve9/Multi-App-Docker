import logging
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.schemas.contact import ContactRequest
from app.core.database import get_db
from app.services.lead_service import create_lead
from app.services.pipeline import run_lead_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("", status_code=201)
async def create_contact(
    payload: ContactRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Crée le lead en DB et lance le pipeline en arrière-plan.
    Réponse immédiate au frontend — pas d'attente IA.
    """
    lead = create_lead(db, payload.model_dump())
    background_tasks.add_task(run_lead_pipeline, lead.id)

    return {
        "status": "ok",
        "lead_id": lead.id,
        "message": "Votre message a bien été reçu, nous vous répondons rapidement."
    }