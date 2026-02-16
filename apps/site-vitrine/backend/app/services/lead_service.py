from sqlalchemy.orm import Session
from app.models.lead import Lead


def create_lead(db: Session, payload: dict) -> Lead:
    """
    Crée et sauvegarde un lead en base de données
    """

    lead = Lead(
        # Client
        name=payload["client"]["name"],
        email=payload["client"]["email"],
        phone=payload["client"].get("phone"),
        subject=payload["client"].get("subject"),
        message=payload["client"].get("message"),

        # Analyse
        category=payload["analysis"]["category"],
        intent=payload["analysis"].get("intent"),
        priority=payload["analysis"]["priority"],
        priority_score=payload["analysis"]["priority_score"],
        summary=payload["analysis"].get("summary"),
        next_action=payload["analysis"].get("next_action"),

        # Meta
        source=payload.get("meta", {}).get("source", "website"),
        status="new",
        response_required=True,
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead
