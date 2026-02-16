from sqlalchemy.orm import Session
from app.models.lead import Lead


def create_lead(db: Session, contact_data: dict) -> Lead:
    """
    Crée un lead en base de données à partir des données du formulaire contact
    """

    lead = Lead(
        name=contact_data.get("name"),
        email=contact_data.get("email"),
        phone=contact_data.get("phone"),
        subject=contact_data.get("subject"),
        message=contact_data.get("message"),

        category="contact",
        intent=None,

        priority="medium",
        priority_score=50,

        summary=None,
        next_action=None,

        source="website",
        status="new",
        response_required=True,
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead
