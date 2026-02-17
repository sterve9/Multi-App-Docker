from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.contact import ContactRequest
from app.core.database import get_db
from app.services.lead_service import create_lead, update_lead_analysis
from app.services.claude import ClaudeService

router = APIRouter(prefix="/contact", tags=["Contact"])

claude = ClaudeService()


@router.post("", status_code=201)
def create_contact(
    payload: ContactRequest,
    db: Session = Depends(get_db),
):
    try:
        # 1️⃣ Création du lead brut
        lead = create_lead(db, payload.model_dump())

        # 2️⃣ Analyse IA
        analysis = claude.analyze_contact(
            name=lead.name,
            email=lead.email,
            phone=lead.phone,
            subject=lead.subject,
            message=lead.message,
        )

        # 3️⃣ Enrichissement DB
        lead = update_lead_analysis(db, lead, analysis)

        return {
            "status": "ok",
            "lead_id": lead.id,
            "priority": lead.priority,
            "category": lead.category,
            "next_action": lead.next_action,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur traitement contact: {str(e)}"
        )
