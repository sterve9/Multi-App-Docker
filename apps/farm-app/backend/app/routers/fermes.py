from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/fermes", tags=["fermes"])


@router.get("/", response_model=List[schemas.FermeOut])
def list_fermes(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Ferme).all()


@router.post("/", response_model=schemas.FermeOut)
def create_ferme(ferme: schemas.FermeCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_ferme = models.Ferme(**ferme.model_dump())
    db.add(db_ferme)
    db.commit()
    db.refresh(db_ferme)
    return db_ferme


@router.get("/{ferme_id}", response_model=schemas.FermeOut)
def get_ferme(ferme_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    return ferme


@router.delete("/{ferme_id}")
def delete_ferme(ferme_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    db.delete(ferme)
    db.commit()
    return {"message": "Ferme supprimée"}


@router.get("/dashboard/all", response_model=List[schemas.DashboardFerme])
def get_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    fermes = db.query(models.Ferme).all()
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
