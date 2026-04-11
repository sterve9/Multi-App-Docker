from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..deps import get_accessible_ferme_ids, check_ferme_access

router = APIRouter(prefix="/depenses", tags=["depenses"])


@router.get("/", response_model=List[schemas.DepenseOut])
def list_depenses(
    ferme_id: Optional[int] = Query(None),
    annee: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    accessible = get_accessible_ferme_ids(user, db)
    q = db.query(models.Depense)
    if ferme_id:
        check_ferme_access(ferme_id, user, db)
        q = q.filter(models.Depense.ferme_id == ferme_id)
    elif accessible is not None:
        q = q.filter(models.Depense.ferme_id.in_(accessible))
    if annee:
        from sqlalchemy import extract
        q = q.filter(extract('year', models.Depense.date) == annee)
    return q.order_by(models.Depense.date.desc()).all()


@router.post("/", response_model=schemas.DepenseOut)
def create_depense(
    body: schemas.DepenseCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    check_ferme_access(body.ferme_id, user, db)
    dep = models.Depense(**body.model_dump())
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


@router.put("/{dep_id}", response_model=schemas.DepenseOut)
def update_depense(
    dep_id: int,
    body: schemas.DepenseUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    dep = db.query(models.Depense).filter(models.Depense.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dépense introuvable")
    check_ferme_access(dep.ferme_id, user, db)
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(dep, field, val)
    db.commit()
    db.refresh(dep)
    return dep


@router.delete("/{dep_id}")
def delete_depense(
    dep_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    dep = db.query(models.Depense).filter(models.Depense.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dépense introuvable")
    check_ferme_access(dep.ferme_id, user, db)
    db.delete(dep)
    db.commit()
    return {"message": "Dépense supprimée"}
