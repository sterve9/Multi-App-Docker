from pydantic import BaseModel, Field
from typing import Literal


class LeadAnalysis(BaseModel):
    """
    Contrat strict de l'analyse IA (Claude)

    Ce modèle définit EXACTEMENT ce que l'IA a le droit de retourner.
    Toute autre structure sera rejetée automatiquement.
    """

    category: Literal[
        "automation",
        "website",
        "ai",
        "consulting",
        "ecommerce",
        "other"
    ] = Field(
        ...,
        description="Catégorie principale du besoin"
    )

    intent: str = Field(
        ...,
        description="Intention principale du client en une phrase courte"
    )

    priority: Literal["low", "medium", "high"] = Field(
        ...,
        description="Niveau de priorité business"
    )

    priority_score: int = Field(
        ...,
        ge=1,
        le=10,
        description="Score de priorité de 1 (faible) à 10 (critique)"
    )

    summary: str = Field(
        ...,
        description="Résumé synthétique du lead"
    )

    next_action: str = Field(
        ...,
        description="Action commerciale recommandée"
    )
