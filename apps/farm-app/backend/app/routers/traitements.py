from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db, SessionLocal
from ..auth import get_current_user
from ..services.webhook import trigger_stock_alerte

router = APIRouter(prefix="/traitements", tags=["traitements"])


def _check_stock_alerte(stock_id: int):
    """Background task — ouvre sa propre session DB pour éviter les conflits."""
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


@router.get("/", response_model=List[schemas.TraitementOut])
def list_traitements(
    parcelle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    query = db.query(models.Traitement).order_by(models.Traitement.date.desc())
    if parcelle_id:
        query = query.filter(models.Traitement.parcelle_id == parcelle_id)
    return query.all()


@router.post("/", response_model=schemas.TraitementOut)
def create_traitement(
    t: schemas.TraitementCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    parcelle = db.query(models.Parcelle).filter(models.Parcelle.id == t.parcelle_id).first()
    if not parcelle:
        raise HTTPException(status_code=404, detail="Parcelle introuvable")

    # Créer le traitement
    db_t = models.Traitement(**t.model_dump())
    db.add(db_t)

    # Si un stock est lié et une dose renseignée → sortie automatique
    if t.stock_id and t.dose:
        stock = db.query(models.Stock).filter(models.Stock.id == t.stock_id).first()
        if not stock:
            raise HTTPException(status_code=404, detail="Stock introuvable")

        # Créer le mouvement de sortie
        mouvement = models.MouvementStock(
            stock_id=t.stock_id,
            type_mouvement=models.TypeMouvementEnum.sortie,
            quantite=t.dose,
            cout_unitaire=0,
            notes=f"Traitement auto — {parcelle.nom} · {t.date}"
        )
        db.add(mouvement)

        # Déduire la quantité du stock
        stock.quantite = max(0, (stock.quantite or 0) - t.dose)

        db.commit()
        db.refresh(db_t)

        # Vérifier le seuil en background (session DB indépendante)
        background_tasks.add_task(_check_stock_alerte, t.stock_id)
    else:
        db.commit()
        db.refresh(db_t)

    return db_t


@router.put("/{traitement_id}", response_model=schemas.TraitementOut)
def update_traitement(
    traitement_id: int,
    t: schemas.TraitementCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    db_t = db.query(models.Traitement).filter(models.Traitement.id == traitement_id).first()
    if not db_t:
        raise HTTPException(status_code=404, detail="Traitement introuvable")
    for key, value in t.model_dump(exclude_unset=True).items():
        setattr(db_t, key, value)
    db.commit()
    db.refresh(db_t)
    return db_t


@router.delete("/{traitement_id}")
def delete_traitement(
    traitement_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    t = db.query(models.Traitement).filter(models.Traitement.id == traitement_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Traitement introuvable")
    db.delete(t)
    db.commit()
    return {"message": "Traitement supprimé"}
