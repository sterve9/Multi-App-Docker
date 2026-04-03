from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/", response_model=List[schemas.StockOut])
def list_stocks(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Stock).all()


@router.get("/alertes", response_model=List[schemas.StockOut])
def list_alertes(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Stock).filter(
        models.Stock.quantite <= models.Stock.seuil_alerte,
        models.Stock.seuil_alerte > 0
    ).all()


@router.post("/", response_model=schemas.StockOut)
def create_stock(s: schemas.StockCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_s = models.Stock(**s.model_dump())
    db.add(db_s)
    db.commit()
    db.refresh(db_s)
    return db_s


@router.put("/{stock_id}", response_model=schemas.StockOut)
def update_stock(stock_id: int, data: schemas.StockUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    s = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Stock introuvable")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(s, key, value)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{stock_id}")
def delete_stock(stock_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    s = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Stock introuvable")
    db.delete(s)
    db.commit()
    return {"message": "Stock supprimé"}
