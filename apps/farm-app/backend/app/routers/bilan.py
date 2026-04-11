from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from typing import List, Dict
from pydantic import BaseModel
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..deps import check_ferme_access

router = APIRouter(prefix="/bilan", tags=["bilan"])


class VarieteComparaison(BaseModel):
    variete: str
    annee_n: float    # kg année selectionnée
    annee_n1: float   # kg année précédente
    valeur_n: float
    valeur_n1: float
    evolution_pct: float  # % évolution kg

class ComparaisonBilan(BaseModel):
    annee_n: int
    annee_n1: int
    par_variete: List[VarieteComparaison]
    total_n: float
    total_n1: float
    total_evolution_pct: float


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
    check_ferme_access(ferme_id, user, db)

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

    # ── Dépenses diverses ──────────────────────────────────
    depenses_diverses_rows = db.query(models.Depense).filter(
        models.Depense.ferme_id == ferme_id,
        extract("year", models.Depense.date) == annee
    ).all()

    total_depenses_diverses = sum(d.montant for d in depenses_diverses_rows)

    # Regrouper par catégorie
    dep_par_cat: dict = {}
    for d in depenses_diverses_rows:
        cat = d.categorie.value
        dep_par_cat[cat] = dep_par_cat.get(cat, 0) + d.montant
    depenses_diverses = [
        schemas.DepenseDiverseItem(categorie=cat, total=round(total, 2))
        for cat, total in sorted(dep_par_cat.items(), key=lambda x: x[1], reverse=True)
    ]

    marge_brute = total_recolte_valeur - total_couts
    marge_nette = total_recolte_valeur - total_couts - total_depenses_diverses

    return schemas.BilanSaison(
        ferme=schemas.FermeOut.model_validate(ferme),
        annee=annee,
        total_recolte_kg=round(total_recolte_kg, 2),
        total_recolte_valeur=round(total_recolte_valeur, 2),
        total_couts=round(total_couts, 2),
        total_depenses_diverses=round(total_depenses_diverses, 2),
        marge_brute=round(marge_brute, 2),
        marge_nette=round(marge_nette, 2),
        nb_recoltes=nb_recoltes,
        nb_traitements=nb_traitements,
        top_depenses=[schemas.DepenseItem(**d) for d in top_depenses],
        depenses_diverses=depenses_diverses,
    )


@router.get("/{ferme_id}/comparaison", response_model=ComparaisonBilan)
def get_comparaison(
    ferme_id: int,
    annee: int = Query(default=2025),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    check_ferme_access(ferme_id, user, db)

    parcelle_ids = [p.id for p in ferme.parcelles]
    annee_n1 = annee - 1

    def recoltes_par_variete(annee_cible: int) -> Dict[str, dict]:
        result: Dict[str, dict] = {}
        if not parcelle_ids:
            return result
        recoltes = db.query(models.Recolte).filter(
            models.Recolte.parcelle_id.in_(parcelle_ids),
            extract("year", models.Recolte.date) == annee_cible
        ).all()
        for r in recoltes:
            parcelle = db.query(models.Parcelle).filter(models.Parcelle.id == r.parcelle_id).first()
            if not parcelle:
                continue
            v = parcelle.variete.value
            if v not in result:
                result[v] = {"kg": 0.0, "valeur": 0.0}
            result[v]["kg"] += r.quantite_kg
            result[v]["valeur"] += r.quantite_kg * (r.prix_kg or 0)
        return result

    data_n = recoltes_par_variete(annee)
    data_n1 = recoltes_par_variete(annee_n1)

    # Union des variétés trouvées dans les 2 années
    varietes = sorted(set(list(data_n.keys()) + list(data_n1.keys())))

    par_variete = []
    for v in varietes:
        kg_n = data_n.get(v, {}).get("kg", 0.0)
        kg_n1 = data_n1.get(v, {}).get("kg", 0.0)
        val_n = data_n.get(v, {}).get("valeur", 0.0)
        val_n1 = data_n1.get(v, {}).get("valeur", 0.0)
        if kg_n1 > 0:
            evol = round((kg_n - kg_n1) / kg_n1 * 100, 1)
        elif kg_n > 0:
            evol = 100.0
        else:
            evol = 0.0
        par_variete.append(VarieteComparaison(
            variete=v,
            annee_n=round(kg_n, 1),
            annee_n1=round(kg_n1, 1),
            valeur_n=round(val_n, 2),
            valeur_n1=round(val_n1, 2),
            evolution_pct=evol,
        ))

    total_n = sum(v.annee_n for v in par_variete)
    total_n1 = sum(v.annee_n1 for v in par_variete)
    if total_n1 > 0:
        total_evol = round((total_n - total_n1) / total_n1 * 100, 1)
    elif total_n > 0:
        total_evol = 100.0
    else:
        total_evol = 0.0

    return ComparaisonBilan(
        annee_n=annee,
        annee_n1=annee_n1,
        par_variete=par_variete,
        total_n=round(total_n, 1),
        total_n1=round(total_n1, 1),
        total_evolution_pct=total_evol,
    )
