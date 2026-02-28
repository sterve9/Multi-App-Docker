"""
Pipeline site vitrine : analyse lead → génère email → envoie → notifie
"""
import logging
from app.core.database import SessionLocal
from app.models.lead import Lead
from app.services.claude_service import ClaudeService
from app.services.lead_service import update_lead_analysis
from app.services.n8n_service import trigger_n8n_webhook
from app.services.telegram import notify_lead_ready, notify_lead_failed

logger = logging.getLogger(__name__)

claude_service = ClaudeService()


async def run_lead_pipeline(lead_id: int):
    """Pipeline complet : analyse + email + notification"""
    db = SessionLocal()
    try:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise Exception(f"Lead {lead_id} introuvable")

        logger.info(f"Pipeline lead {lead_id} — démarrage")

        # Étape 1 — Analyse IA
        logger.info(f"Lead {lead_id} — analyse Claude...")
        analysis = await claude_service.analyze_contact(
            name=lead.name,
            email=lead.email,
            phone=lead.phone,
            subject=lead.subject,
            message=lead.message,
        )
        lead = update_lead_analysis(db, lead, analysis)
        logger.info(f"Lead {lead_id} — analyse ✅")

        # Étape 2 — Génération email
        logger.info(f"Lead {lead_id} — génération email...")
        email_data = await claude_service.generate_email(
            name=lead.name,
            email=lead.email,
            message=lead.message,
            category=lead.category,
            intent=lead.intent,
            priority=lead.priority,
            summary=lead.summary,
            next_action=lead.next_action,
        )
        logger.info(f"Lead {lead_id} — email généré ✅")

        # Étape 3 — Trigger n8n pour envoi email uniquement
        await trigger_n8n_webhook({
            "lead_id": lead_id,
            "email": lead.email,
            "subject": email_data["subject"],
            "body": email_data["body"],
            "original_message": lead.message,
        })
        logger.info(f"Lead {lead_id} — n8n notifié ✅")

        # Étape 4 — Notification Telegram
        await notify_lead_ready(
            lead_id=lead_id,
            name=lead.name,
            priority=lead.priority,
            category=lead.category,
        )

        logger.info(f"Pipeline lead {lead_id} — terminé ✅")

    except Exception as e:
        logger.error(f"Pipeline lead {lead_id} échoué : {e}")
        await notify_lead_failed(lead_id=lead_id, error=str(e))

    finally:
        db.close()
