from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..deps import get_accessible_ferme_ids, check_ferme_access

router = APIRouter(prefix="/recoltes", tags=["récoltes"])


@router.get("/", response_model=List[schemas.RecolteOut])
def list_recoltes(parcelle_id: Optional[int] = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    accessible = get_accessible_ferme_ids(user, db)
    query = db.query(models.Recolte).join(models.Parcelle).order_by(models.Recolte.date.desc())
    if parcelle_id:
        query = query.filter(models.Recolte.parcelle_id == parcelle_id)
    if accessible is not None:
        query = query.filter(models.Parcelle.ferme_id.in_(accessible))
    return query.all()


@router.post("/", response_model=schemas.RecolteOut)
def create_recolte(r: schemas.RecolteCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    parcelle = db.query(models.Parcelle).filter(models.Parcelle.id == r.parcelle_id).first()
    if not parcelle:
        raise HTTPException(status_code=404, detail="Parcelle introuvable")
    check_ferme_access(parcelle.ferme_id, user, db)
    db_r = models.Recolte(**r.model_dump())
    db.add(db_r)
    db.commit()
    db.refresh(db_r)
    return db_r


@router.put("/{recolte_id}", response_model=schemas.RecolteOut)
def update_recolte(recolte_id: int, r: schemas.RecolteCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_r = db.query(models.Recolte).filter(models.Recolte.id == recolte_id).first()
    if not db_r:
        raise HTTPException(status_code=404, detail="Récolte introuvable")
    for key, value in r.model_dump(exclude_unset=True).items():
        setattr(db_r, key, value)
    db.commit()
    db.refresh(db_r)
    return db_r


@router.delete("/{recolte_id}")
def delete_recolte(recolte_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = db.query(models.Recolte).filter(models.Recolte.id == recolte_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Récolte introuvable")
    db.delete(r)
    db.commit()
    return {"message": "Récolte supprimée"}
