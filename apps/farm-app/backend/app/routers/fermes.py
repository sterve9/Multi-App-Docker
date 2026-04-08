from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

JOURS_ISO = {
    "lundi": 0, "mardi": 1, "mercredi": 2, "jeudi": 3,
    "vendredi": 4, "samedi": 5, "dimanche": 6
}
JOURS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

router = APIRouter(prefix="/fermes", tags=["fermes"])


def _ferme_query(db: Session, user: models.User):
    """Returns a query filtered by user permissions."""
    q = db.query(models.Ferme)
    if user.role != models.RoleEnum.admin:
        q = q.filter(models.Ferme.owner_id == user.id)
    return q


@router.get("/", response_model=List[schemas.FermeOut])
def list_fermes(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _ferme_query(db, user).all()


@router.post("/", response_model=schemas.FermeOut)
def create_ferme(ferme: schemas.FermeCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    db_ferme = models.Ferme(**ferme.model_dump(), owner_id=user.id)
    db.add(db_ferme)
    db.commit()
    db.refresh(db_ferme)
    return db_ferme


@router.get("/{ferme_id}", response_model=schemas.FermeOut)
def get_ferme(ferme_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    ferme = _ferme_query(db, user).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    return ferme


@router.delete("/{ferme_id}")
def delete_ferme(ferme_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    ferme = _ferme_query(db, user).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    db.delete(ferme)
    db.commit()
    return {"message": "Ferme supprimée"}


@router.put("/{ferme_id}/config", response_model=schemas.FermeOut)
def update_ferme_config(ferme_id: int, config: schemas.FermeConfigUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    if config.nb_vannes is not None:
        ferme.nb_vannes = config.nb_vannes
    if config.jours_irrigation is not None:
        ferme.jours_irrigation = config.jours_irrigation
    db.commit()
    db.refresh(ferme)
    return ferme


@router.get("/{ferme_id}/planning", response_model=schemas.PlanningFerme)
def get_planning(ferme_id: int, nb_semaines: int = 3, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")

    # Parse jours d'irrigation configurés
    jours_config = [j.strip().lower() for j in (ferme.jours_irrigation or "").split(",") if j.strip()]
    jours_iso = [JOURS_ISO[j] for j in jours_config if j in JOURS_ISO]

    # Stocks avec dose configurée
    stocks_doses = db.query(models.Stock).filter(
        models.Stock.ferme_id == ferme_id,
        models.Stock.dose_par_vanne > 0
    ).all()

    # Sessions par semaine pour calcul semaines restantes
    sessions_par_semaine = len(jours_iso) or 1

    # Générer les dates à venir sur nb_semaines
    today = date.today()
    dates_planifiees = []
    for i in range(nb_semaines * 7):
        d = today + timedelta(days=i)
        if d.weekday() in jours_iso:
            dates_planifiees.append(d)

    # Récupérer sessions déjà enregistrées pour ces dates
    sessions_db = db.query(models.SessionIrrigation).filter(
        models.SessionIrrigation.ferme_id == ferme_id,
        models.SessionIrrigation.date.in_(dates_planifiees)
    ).all()
    sessions_map = {s.date: s for s in sessions_db}

    result_sessions = []
    for d in dates_planifiees:
        produits = []
        for s in stocks_doses:
            qte = s.dose_par_vanne * (ferme.nb_vannes or 1)
            consommation_sem = qte * sessions_par_semaine
            semaines_restantes = round(s.quantite / consommation_sem, 1) if consommation_sem > 0 and s.quantite > 0 else 0.0
            en_alerte = s.seuil_alerte > 0 and s.quantite <= s.seuil_alerte
            produits.append(schemas.ProduitSession(
                stock_id=s.id,
                nom=s.nom,
                unite=s.unite,
                dose_unite=s.dose_unite or "kg",
                dose_par_vanne=s.dose_par_vanne,
                qte_deduite=qte,
                quantite_actuelle=s.quantite,
                semaines_restantes=semaines_restantes,
                en_alerte=en_alerte,
            ))
        session_db = sessions_map.get(d)
        result_sessions.append(schemas.SessionPlanifiee(
            date=d,
            jour_semaine=JOURS_FR[d.weekday()],
            produits=produits,
            session_id=session_db.id if session_db else None,
            statut=session_db.statut.value if session_db else None,
        ))

    return schemas.PlanningFerme(
        ferme_id=ferme.id,
        ferme_nom=ferme.nom,
        nb_vannes=ferme.nb_vannes or 1,
        jours_irrigation=ferme.jours_irrigation or "",
        sessions=result_sessions,
    )


@router.get("/dashboard/all", response_model=List[schemas.DashboardFerme])
def get_dashboard(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    fermes = _ferme_query(db, user).all()
    result = []
    for ferme in fermes:
        parcelles = db.query(models.Parcelle).filter(models.Parcelle.ferme_id == ferme.id).all()
        nb_arbres = sum(p.nb_arbres or 0 for p in parcelles)
        parcelle_ids = [p.id for p in parcelles]

        recolte_total = 0.0
        if parcelle_ids:
            total = db.query(func.sum(models.Recolte.quantite_kg)).filter(
                models.Recolte.parcelle_id.in_(parcelle_ids)
            ).scalar()
            recolte_total = total or 0.0

        dernier_traitement = None
        if parcelle_ids:
            last = db.query(func.max(models.Traitement.date)).filter(
                models.Traitement.parcelle_id.in_(parcelle_ids)
            ).scalar()
            dernier_traitement = last

        stocks_alerte = db.query(models.Stock).filter(
            models.Stock.ferme_id == ferme.id,
            models.Stock.quantite <= models.Stock.seuil_alerte,
            models.Stock.seuil_alerte > 0
        ).count()

        result.append(schemas.DashboardFerme(
            ferme=ferme,
            nb_parcelles=len(parcelles),
            nb_arbres_total=nb_arbres,
            recolte_total_kg=recolte_total,
            dernier_traitement=dernier_traitement,
            stocks_alerte=stocks_alerte,
        ))
    return result
