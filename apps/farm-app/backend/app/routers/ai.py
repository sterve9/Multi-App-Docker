from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
import os
import json

import anthropic

from ..database import get_db
from ..auth import get_current_user
from .. import models, schemas

router = APIRouter(prefix="/ai", tags=["ai"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


def _build_context(ferme_id: int, db: Session) -> str:
    """Construit le contexte ferme à injecter dans le system prompt."""
    ferme = db.query(models.Ferme).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")

    # Parcelles
    parcelles = db.query(models.Parcelle).filter(models.Parcelle.ferme_id == ferme_id).all()

    # Stocks
    stocks = db.query(models.Stock).filter(models.Stock.ferme_id == ferme_id).all()

    # Traitements 90 derniers jours
    cutoff = date.today() - timedelta(days=90)
    traitements = (
        db.query(models.Traitement)
        .join(models.Parcelle)
        .filter(
            models.Parcelle.ferme_id == ferme_id,
            models.Traitement.date >= cutoff,
        )
        .order_by(models.Traitement.date.desc())
        .limit(50)
        .all()
    )

    # Récoltes de l'année en cours
    annee = date.today().year
    recoltes = (
        db.query(models.Recolte)
        .join(models.Parcelle)
        .filter(
            models.Parcelle.ferme_id == ferme_id,
            models.Recolte.date >= date(annee, 1, 1),
        )
        .order_by(models.Recolte.date.desc())
        .all()
    )

    # Recommandations en attente
    recommandations = (
        db.query(models.Recommandation)
        .filter(
            models.Recommandation.ferme_id == ferme_id,
            models.Recommandation.statut == models.StatutRecommandationEnum.en_attente,
        )
        .all()
    )

    # Construction du contexte
    lines = []
    lines.append(f"Ferme : {ferme.nom}")
    if ferme.localisation:
        lines.append(f"Localisation : {ferme.localisation}")
    if ferme.surface_ha:
        lines.append(f"Surface : {ferme.surface_ha} ha")
    lines.append(f"Vannes : {ferme.nb_vannes} | Jours fertilisation : {ferme.jours_irrigation or 'non configurés'}")

    lines.append(f"\nPARCELLES ({len(parcelles)}) :")
    for p in parcelles:
        arbres = f"{p.nb_arbres} arbres" if p.nb_arbres else "nb arbres inconnu"
        lines.append(f"  - {p.nom} | {p.variete.value} | {arbres} | statut: {p.statut.value}")

    lines.append(f"\nSTOCKS ACTUELS ({len(stocks)}) :")
    for s in stocks:
        seuil_info = f"seuil {s.seuil_alerte} {s.unite}" if s.seuil_alerte > 0 else "pas de seuil"
        alerte = " ⚠️ SOUS LE SEUIL" if s.seuil_alerte > 0 and s.quantite <= s.seuil_alerte else ""
        dose_info = ""
        if s.dose_par_vanne and s.dose_par_vanne > 0 and ferme.nb_vannes:
            consommation_session = s.dose_par_vanne * ferme.nb_vannes
            if consommation_session > 0:
                semaines = round(s.quantite / consommation_session, 1) if consommation_session > 0 else None
                dose_info = f" | ~{semaines} sessions restantes"
        lines.append(
            f"  - {s.nom} : {s.quantite} {s.unite or ''} ({seuil_info}){alerte}{dose_info}"
        )

    lines.append(f"\nTRAITEMENTS 90 DERNIERS JOURS ({len(traitements)}) :")
    if traitements:
        for t in traitements:
            dose_str = f"{t.dose} {t.unite}" if t.dose else ""
            lines.append(f"  - {t.date} | {t.type_traitement.value} | {t.produit or '-'} {dose_str}")
    else:
        lines.append("  Aucun traitement enregistré sur cette période.")

    total_kg = sum(r.quantite_kg for r in recoltes)
    total_valeur = sum(r.quantite_kg * r.prix_kg for r in recoltes)
    lines.append(f"\nRÉCOLTES {annee} ({len(recoltes)} entrées) :")
    if recoltes:
        for r in recoltes:
            valeur = r.quantite_kg * r.prix_kg
            lines.append(f"  - {r.date} | {r.quantite_kg} kg | {r.qualite.value if r.qualite else '-'} | {r.prix_kg} TND/kg = {valeur:.0f} TND")
        lines.append(f"  TOTAL : {total_kg:.0f} kg — {total_valeur:.0f} TND")
    else:
        lines.append("  Aucune récolte enregistrée pour cette année.")

    lines.append(f"\nRECOMMANDATIONS EN ATTENTE ({len(recommandations)}) :")
    if recommandations:
        for rec in recommandations:
            lines.append(f"  - [{rec.priorite.value}] {rec.contenu[:120]}")
    else:
        lines.append("  Aucune recommandation en attente.")

    return "\n".join(lines)


@router.post("/chat", response_model=schemas.ChatResponse)
def chat(
    body: schemas.ChatRequest,
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY non configurée")

    context = _build_context(body.ferme_id, db)

    system_prompt = f"""Tu es un assistant agronomique expert spécialisé dans les exploitations agrumicoles (citrons, oranges, clémentines) en Tunisie.
Tu analyses les données réelles de la ferme et réponds en français (ou en arabe si l'utilisateur écrit en arabe).
Sois concis, pratique et actionnable. Utilise les données fournies pour personnaliser tes réponses.
Si une donnée manque pour répondre précisément, dis-le clairement.

=== DONNÉES ACTUELLES DE LA FERME ===
{context}
==="""

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    )

    return {"reply": response.content[0].text}


@router.post("/analyse/{ferme_id}", response_model=schemas.AnalyseResponse)
def analyser_ferme(
    ferme_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY non configurée")

    context = _build_context(ferme_id, db)

    prompt = f"""Analyse cette exploitation agrumicole et génère entre 3 et 6 recommandations concrètes, prioritaires et actionnables.

=== DONNÉES DE LA FERME ===
{context}
===

Identifie les points critiques : stocks bas, traitements manquants, rendements anormaux, optimisations possibles.

Réponds UNIQUEMENT avec un JSON valide (tableau), sans texte avant ni après, sans markdown :
[
  {{"priorite": "haute", "contenu": "Recommandation précise et actionnable"}},
  {{"priorite": "normale", "contenu": "Recommandation précise et actionnable"}},
  {{"priorite": "basse", "contenu": "Recommandation précise et actionnable"}}
]

Les valeurs de priorité doivent être exactement : "haute", "normale" ou "basse"."""

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()

    # Extraire le JSON même si Claude ajoute du texte
    start = raw.find("[")
    end = raw.rfind("]") + 1
    if start == -1 or end == 0:
        raise HTTPException(status_code=500, detail="Réponse IA invalide — réessaie")

    try:
        items = json.loads(raw[start:end])
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Impossible de parser la réponse IA")

    # Valider et créer les recommandations en DB
    priorites_valides = {"haute", "normale", "basse"}
    created = []
    for item in items:
        priorite_str = str(item.get("priorite", "normale")).lower()
        if priorite_str not in priorites_valides:
            priorite_str = "normale"
        contenu = str(item.get("contenu", "")).strip()
        if not contenu:
            continue

        rec = models.Recommandation(
            ferme_id=ferme_id,
            auteur="IA - Claude",
            contenu=contenu,
            priorite=models.PrioriteEnum(priorite_str),
            statut=models.StatutRecommandationEnum.en_attente,
        )
        db.add(rec)
        created.append(contenu)

    db.commit()

    return {"nb_recommandations": len(created), "recommandations": created}
