# backend/app/services/decision_engine.py

def evaluate_lead(lead_data: dict) -> dict:
    """
    Décide quoi faire avec un lead.
    Version hybride : rules aujourd'hui, IA demain.
    """

    score = lead_data.get("priority_score", 0)
    category = lead_data.get("category", "").lower()

    decision = {
        "status": "new",
        "automation_required": False,
        "action": None,
    }

    # 🔥 RULES ENGINE (solide)
    if score >= 80:
        decision["status"] = "qualified"
        decision["automation_required"] = True
        decision["action"] = "immediate_contact"

    elif score >= 50:
        decision["status"] = "to_review"
        decision["automation_required"] = True
        decision["action"] = "crm_followup"

    else:
        decision["status"] = "low_priority"
        decision["action"] = "store_only"

    # 🧠 FUTUR IA (placeholder clean)
    decision["ai_ready"] = True

    return decision
