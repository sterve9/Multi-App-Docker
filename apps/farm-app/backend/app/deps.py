"""Fonctions utilitaires partagées entre les routers."""
from typing import Optional, List
from sqlalchemy.orm import Session
from . import models


def get_accessible_ferme_ids(user: models.User, db: Session) -> Optional[List[int]]:
    """
    Retourne la liste des ferme_id accessibles pour l'utilisateur.
    - admin / ingénieur : None → pas de restriction
    - gestionnaire : uniquement ses fermes (owner_id == user.id)
    """
    if user.role == models.RoleEnum.gestionnaire:
        ids = [f.id for f in db.query(models.Ferme.id).filter(models.Ferme.owner_id == user.id).all()]
        return ids
    return None  # accès total


def check_ferme_access(ferme_id: int, user: models.User, db: Session) -> None:
    """Lève une 403 si le gestionnaire n'a pas accès à cette ferme."""
    ids = get_accessible_ferme_ids(user, db)
    if ids is not None and ferme_id not in ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Accès refusé à cette ferme")
