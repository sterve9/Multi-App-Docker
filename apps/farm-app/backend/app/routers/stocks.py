from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..services.webhook import trigger_stock_alerte

router = APIRouter(prefix="/stocks", tags=["stocks"])


def _check_and_alert(stock_id: int, db: Session):
    """Vérifie le seuil et déclenche le webhook N8N si dépassé. Exécuté en background."""
    s = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
    if s and s.seuil_alerte > 0 and s.quantite <= s.seuil_alerte:
        ferme_nom = s.ferme.nom if s.ferme else "Ferme inconnue"
        trigger_stock_alerte(
            stock_nom=s.nom,
            quantite=s.quantite,
            unite=s.unite or "",
            seuil=s.seuil_alerte,
            ferme_nom=ferme_nom,
        )


@router.get("/", response_model=List[schemas.StockOut])
def list_stocks(
    ferme_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    q = db.query(models.Stock)
    if ferme_id:
        q = q.filter(models.Stock.ferme_id == ferme_id)
    stocks = q.order_by(models.Stock.nom).all()
    result = []
    for s in stocks:
        out = schemas.StockOut.model_validate(s)
        out.alerte_active = s.seuil_alerte > 0 and s.quantite <= s.seuil_alerte
        result.append(out)
    return result


@router.get("/alertes", response_model=List[schemas.StockOut])
def list_alertes(
    ferme_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    q = db.query(models.Stock).filter(
        models.Stock.quantite <= models.Stock.seuil_alerte,
        models.Stock.seuil_alerte > 0
    )
    if ferme_id:
        q = q.filter(models.Stock.ferme_id == ferme_id)
    return q.all()


@router.post("/", response_model=schemas.StockOut)
def create_stock(
    s: schemas.StockCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == s.ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    db_s = models.Stock(**s.model_dump())
    db.add(db_s)
    db.commit()
    db.refresh(db_s)
    out = schemas.StockOut.model_validate(db_s)
    out.alerte_active = db_s.seuil_alerte > 0 and db_s.quantite <= db_s.seuil_alerte
    return out


@router.put("/{stock_id}", response_model=schemas.StockOut)
def update_stock(
    stock_id: int,
    data: schemas.StockUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    s = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Stock introuvable")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(s, key, value)
    db.commit()
    db.refresh(s)
    # Déclencher email en background si seuil atteint
    background_tasks.add_task(_check_and_alert, stock_id, db)
    out = schemas.StockOut.model_validate(s)
    out.alerte_active = s.seuil_alerte > 0 and s.quantite <= s.seuil_alerte
    return out


@router.delete("/{stock_id}")
def delete_stock(
    stock_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    s = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Stock introuvable")
    db.delete(s)
    db.commit()
    return {"message": "Stock supprimé"}
