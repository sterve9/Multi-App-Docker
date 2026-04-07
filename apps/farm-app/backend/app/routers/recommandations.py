from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/recommandations", tags=["recommandations"])


@router.get("/", response_model=List[schemas.RecommandationOut])
def list_recommandations(
    ferme_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    q = db.query(models.Recommandation)
    if ferme_id:
        q = q.filter(models.Recommandation.ferme_id == ferme_id)
    if statut:
        q = q.filter(models.Recommandation.statut == statut)
    return q.order_by(models.Recommandation.date.desc()).all()


@router.post("/", response_model=schemas.RecommandationOut)
def create_recommandation(
    r: schemas.RecommandationCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == r.ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    db_r = models.Recommandation(**r.model_dump())
    db.add(db_r)
    db.commit()
    db.refresh(db_r)
    return db_r


@router.put("/{rec_id}", response_model=schemas.RecommandationOut)
def update_recommandation(
    rec_id: int,
    data: schemas.RecommandationUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    r = db.query(models.Recommandation).filter(models.Recommandation.id == rec_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recommandation introuvable")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(r, key, value)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{rec_id}")
def delete_recommandation(
    rec_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    r = db.query(models.Recommandation).filter(models.Recommandation.id == rec_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recommandation introuvable")
    db.delete(r)
    db.commit()
    return {"message": "Recommandation supprimée"}
