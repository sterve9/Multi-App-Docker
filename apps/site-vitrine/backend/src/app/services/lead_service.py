from sqlalchemy.orm import Session
from app.models.lead import Lead
from app.schemas.analysis import LeadAnalysis


def create_lead(db: Session, data: dict) -> Lead:
    lead = Lead(
        name=data["name"],
        email=data["email"],
        phone=data.get("phone"),
        subject=data.get("subject"),
        message=data["message"],
        category="contact",
        priority="medium",
        priority_score=5,
        source="website",
        status="new",
        response_required=True,
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def update_lead_analysis(
    db: Session,
    lead: Lead,
    analysis: LeadAnalysis
) -> Lead:
    lead.category = analysis.category
    lead.intent = analysis.intent
    lead.priority = analysis.priority
    lead.priority_score = analysis.priority_score
    lead.summary = analysis.summary
    lead.next_action = analysis.next_action

    db.commit()
    db.refresh(lead)
    return lead
