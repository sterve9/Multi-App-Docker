from pydantic import BaseModel, EmailStr
from typing import Optional

class ContactRequest(BaseModel):
    """
    Modèle de données pour les demandes de contact
    Utilisé pour valider les données du formulaire
    """
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Jean Dupont",
                "email": "jean@example.com",
                "phone": "+216 12345678",
                "subject": "Automatisation des ventes",
                "message": "Je cherche à automatiser mon processus de vente avec un budget de 5000€"
            }
        }

class LeadAnalysis(BaseModel):
    """
    Modèle pour l'analyse de lead retournée par Claude
    """
    category: str
    intent: str
    priority: str  # low, medium, high
    priority_score: int  # 1-10
    tools: list[str]
    summary: str
    next_action: str
