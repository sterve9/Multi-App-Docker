from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..deps import get_accessible_ferme_ids, check_ferme_access

router = APIRouter(prefix="/parcelles", tags=["parcelles"])


@router.get("/", response_model=List[schemas.ParcelleOut])
def list_parcelles(ferme_id: Optional[int] = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    accessible = get_accessible_ferme_ids(user, db)
    query = db.query(models.Parcelle)
    if ferme_id:
        if accessible is not None and ferme_id not in accessible:
            return []
        query = query.filter(models.Parcelle.ferme_id == ferme_id)
    elif accessible is not None:
        query = query.filter(models.Parcelle.ferme_id.in_(accessible))
    return query.all()


@router.post("/", response_model=schemas.ParcelleOut)
def create_parcelle(parcelle: schemas.ParcelleCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == parcelle.ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    check_ferme_access(parcelle.ferme_id, user, db)
    db_parcelle = models.Parcelle(**parcelle.model_dump())
    db.add(db_parcelle)
    db.commit()
    db.refresh(db_parcelle)
    return db_parcelle


@router.get("/{parcelle_id}", response_model=schemas.ParcelleOut)
def get_parcelle(parcelle_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(models.Parcelle).filter(models.Parcelle.id == parcelle_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parcelle introuvable")
    check_ferme_access(p.ferme_id, user, db)
    return p


@router.put("/{parcelle_id}", response_model=schemas.ParcelleOut)
def update_parcelle(parcelle_id: int, data: schemas.ParcelleUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(models.Parcelle).filter(models.Parcelle.id == parcelle_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parcelle introuvable")
    check_ferme_access(p.ferme_id, user, db)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{parcelle_id}")
def delete_parcelle(parcelle_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(models.Parcelle).filter(models.Parcelle.id == parcelle_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parcelle introuvable")
    check_ferme_access(p.ferme_id, user, db)
    db.delete(p)
    db.commit()
    return {"message": "Parcelle supprimée"}
