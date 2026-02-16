from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.schemas.contact import ContactRequest
from app.services.lead_service import create_lead

router = APIRouter(tags=["contact"])


# Database dependency (identique à ton main)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/contact")
def submit_contact(
    payload: ContactRequest,
    db: Session = Depends(get_db)
):
    lead = create_lead(db, payload.model_dump())


    return {
        "status": "ok",
        "lead_id": lead.id
    }
