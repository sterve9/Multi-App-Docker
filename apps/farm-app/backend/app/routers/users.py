from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, hash_password

router = APIRouter(prefix="/users", tags=["users"])


def require_admin(user: models.User = Depends(get_current_user)):
    if user.role != models.RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    return user


@router.get("/me", response_model=schemas.UserOut)
def get_me(user: models.User = Depends(get_current_user)):
    return user


@router.get("/", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(models.User).order_by(models.User.created_at).all()


@router.post("/", response_model=schemas.UserOut)
def create_user(body: schemas.UserCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    existing = db.query(models.User).filter(models.User.username == body.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ce nom d'utilisateur existe déjà")
    new_user = models.User(
        username=body.username,
        password_hash=hash_password(body.password),
        nom=body.nom,
        role=body.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, body: schemas.UserUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if body.nom is not None:
        target.nom = body.nom
    if body.role is not None:
        target.role = body.role
    db.commit()
    db.refresh(target)
    return target


@router.put("/{user_id}/password")
def change_password(user_id: int, body: schemas.PasswordChange, db: Session = Depends(get_db), admin=Depends(require_admin)):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    target.password_hash = hash_password(body.password)
    db.commit()
    return {"message": "Mot de passe modifié"}


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db.delete(target)
    db.commit()
    return {"message": "Utilisateur supprimé"}
