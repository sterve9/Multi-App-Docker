from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/bilan", tags=["bilan"])


@router.get("/{ferme_id}", response_model=schemas.BilanSaison)
def get_bilan(
    ferme_id: int,
    annee: int = Query(default=2024),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")

    # IDs des parcelles de la ferme
    parcelle_ids = [p.id for p in ferme.parcelles]

    # ── Récoltes ──────────────────────────────────────────
    recoltes = []
    if parcelle_ids:
        recoltes = db.query(models.Recolte).filter(
            models.Recolte.parcelle_id.in_(parcelle_ids),
            extract("year", models.Recolte.date) == annee
        ).all()

    total_recolte_kg = sum(r.quantite_kg for r in recoltes)
    total_recolte_valeur = sum(r.quantite_kg * (r.prix_kg or 0) for r in recoltes)
    nb_recoltes = len(recoltes)

    # ── Traitements ───────────────────────────────────────
    nb_traitements = 0
    if parcelle_ids:
        nb_traitements = db.query(models.Traitement).filter(
            models.Traitement.parcelle_id.in_(parcelle_ids),
            extract("year", models.Traitement.date) == annee
        ).count()

    # ── Coûts via mouvements stock ─────────────────────────
    stock_ids = [s.id for s in ferme.stocks]
    mouvements = []
    if stock_ids:
        mouvements = db.query(models.MouvementStock).filter(
            models.MouvementStock.stock_id.in_(stock_ids),
            models.MouvementStock.type_mouvement == models.TypeMouvementEnum.entree,
            extract("year", models.MouvementStock.date) == annee
        ).all()

    total_couts = sum(m.quantite * (m.cout_unitaire or 0) for m in mouvements)

    # ── Top dépenses par stock ─────────────────────────────
    couts_par_stock: dict = {}
    for m in mouvements:
        stock = db.query(models.Stock).filter(models.Stock.id == m.stock_id).first()
        if stock:
            key = stock.id
            if key not in couts_par_stock:
                couts_par_stock[key] = {"stock_nom": stock.nom, "categorie": stock.categorie.value, "cout_total": 0}
            couts_par_stock[key]["cout_total"] += m.quantite * (m.cout_unitaire or 0)

    top_depenses = sorted(couts_par_stock.values(), key=lambda x: x["cout_total"], reverse=True)

    marge_brute = total_recolte_valeur - total_couts

    return schemas.BilanSaison(
        ferme=schemas.FermeOut.model_validate(ferme),
        annee=annee,
        total_recolte_kg=round(total_recolte_kg, 2),
        total_recolte_valeur=round(total_recolte_valeur, 2),
        total_couts=round(total_couts, 2),
        marge_brute=round(marge_brute, 2),
        nb_recoltes=nb_recoltes,
        nb_traitements=nb_traitements,
        top_depenses=[schemas.DepenseItem(**d) for d in top_depenses],
    )
