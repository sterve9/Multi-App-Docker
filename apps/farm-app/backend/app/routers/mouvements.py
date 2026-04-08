from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db, SessionLocal
from ..auth import get_current_user
from ..services.webhook import trigger_stock_alerte

router = APIRouter(prefix="/mouvements", tags=["mouvements"])


def _check_stock_alerte(stock_id: int):
    db = SessionLocal()
    try:
        s = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
        if s and s.seuil_alerte > 0 and s.quantite <= s.seuil_alerte:
            ferme = db.query(models.Ferme).filter(models.Ferme.id == s.ferme_id).first()
            trigger_stock_alerte(
                stock_nom=s.nom,
                quantite=s.quantite,
                unite=s.unite or "",
                seuil=s.seuil_alerte,
                ferme_nom=ferme.nom if ferme else "Ferme inconnue",
            )
    finally:
        db.close()


@router.get("/", response_model=List[schemas.MouvementOut])
def list_mouvements(
    stock_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    q = db.query(models.MouvementStock)
    if stock_id:
        q = q.filter(models.MouvementStock.stock_id == stock_id)
    return q.order_by(models.MouvementStock.date.desc()).all()


@router.post("/", response_model=schemas.MouvementOut)
def create_mouvement(
    m: schemas.MouvementCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    stock = db.query(models.Stock).filter(models.Stock.id == m.stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock introuvable")

    # Mettre à jour la quantité du stock
    if m.type_mouvement == models.TypeMouvementEnum.entree:
        stock.quantite = (stock.quantite or 0) + m.quantite
    else:
        stock.quantite = max(0, (stock.quantite or 0) - m.quantite)

    db_m = models.MouvementStock(**m.model_dump())
    db.add(db_m)
    db.commit()
    db.refresh(db_m)

    # Déclencher alerte N8N si sortie sous le seuil
    if m.type_mouvement == models.TypeMouvementEnum.sortie:
        background_tasks.add_task(_check_stock_alerte, m.stock_id)

    return db_m


@router.delete("/{mouvement_id}")
def delete_mouvement(
    mouvement_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    m = db.query(models.MouvementStock).filter(models.MouvementStock.id == mouvement_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mouvement introuvable")
    db.delete(m)
    db.commit()
    return {"message": "Mouvement supprimé"}
