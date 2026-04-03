from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/traitements", tags=["traitements"])


@router.get("/", response_model=List[schemas.TraitementOut])
def list_traitements(parcelle_id: Optional[int] = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    query = db.query(models.Traitement).order_by(models.Traitement.date.desc())
    if parcelle_id:
        query = query.filter(models.Traitement.parcelle_id == parcelle_id)
    return query.all()


@router.post("/", response_model=schemas.TraitementOut)
def create_traitement(t: schemas.TraitementCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    parcelle = db.query(models.Parcelle).filter(models.Parcelle.id == t.parcelle_id).first()
    if not parcelle:
        raise HTTPException(status_code=404, detail="Parcelle introuvable")
    db_t = models.Traitement(**t.model_dump())
    db.add(db_t)
    db.commit()
    db.refresh(db_t)
    return db_t


@router.delete("/{traitement_id}")
def delete_traitement(traitement_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    t = db.query(models.Traitement).filter(models.Traitement.id == traitement_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Traitement introuvable")
    db.delete(t)
    db.commit()
    return {"message": "Traitement supprimé"}
