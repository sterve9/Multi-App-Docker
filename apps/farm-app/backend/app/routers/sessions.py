from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from .. import models, schemas
from ..database import get_db, SessionLocal
from ..auth import get_current_user
from ..services.webhook import trigger_stock_alerte

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _check_and_alert(stock_id: int):
    """Background task — ouvre sa propre session DB pour éviter les conflits."""
    db = SessionLocal()
    try:
        stock = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
        if not stock or stock.seuil_alerte <= 0:
            return
        if stock.quantite <= stock.seuil_alerte:
            ferme = db.query(models.Ferme).filter(models.Ferme.id == stock.ferme_id).first()
            trigger_stock_alerte(
                stock_nom=stock.nom,
                quantite=stock.quantite,
                unite=stock.unite or "unité(s)",
                seuil=stock.seuil_alerte,
                ferme_nom=ferme.nom if ferme else "Inconnue",
            )
    finally:
        db.close()


@router.get("/", response_model=List[schemas.SessionOut])
def list_sessions(ferme_id: Optional[int] = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(models.SessionIrrigation)
    if ferme_id:
        q = q.filter(models.SessionIrrigation.ferme_id == ferme_id)
    return q.order_by(models.SessionIrrigation.date.desc()).all()


@router.post("/", response_model=schemas.SessionOut)
def create_session(session: schemas.SessionCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ferme = db.query(models.Ferme).filter(models.Ferme.id == session.ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")
    # Vérifier si une session existe déjà pour cette date
    existing = db.query(models.SessionIrrigation).filter(
        models.SessionIrrigation.ferme_id == session.ferme_id,
        models.SessionIrrigation.date == session.date,
    ).first()
    if existing:
        return existing
    db_session = models.SessionIrrigation(
        ferme_id=session.ferme_id,
        date=session.date,
        notes=session.notes,
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.put("/{session_id}/confirmer", response_model=schemas.ConfirmerSessionOut)
def confirmer_session(session_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), user=Depends(get_current_user)):
    session = db.query(models.SessionIrrigation).filter(models.SessionIrrigation.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session introuvable")
    if session.statut == models.StatutSessionEnum.effectuee:
        raise HTTPException(status_code=400, detail="Session déjà confirmée")

    ferme = db.query(models.Ferme).filter(models.Ferme.id == session.ferme_id).first()
    nb_vannes = ferme.nb_vannes or 1

    stocks_doses = db.query(models.Stock).filter(
        models.Stock.ferme_id == session.ferme_id,
        models.Stock.dose_par_vanne > 0
    ).all()

    mouvements_crees = 0
    alertes_ids = []

    for stock in stocks_doses:
        qte = stock.dose_par_vanne * nb_vannes
        # Créer mouvement sortie
        mouvement = models.MouvementStock(
            stock_id=stock.id,
            type_mouvement=models.TypeMouvementEnum.sortie,
            quantite=qte,
            cout_unitaire=stock.cout_unitaire or 0,
            notes=f"Session fertilisation {session.date.strftime('%d/%m/%Y')}",
        )
        db.add(mouvement)
        stock.quantite = max(0, (stock.quantite or 0) - qte)
        mouvements_crees += 1
        if stock.seuil_alerte > 0 and stock.quantite <= stock.seuil_alerte:
            alertes_ids.append(stock.id)

    session.statut = models.StatutSessionEnum.effectuee
    db.commit()
    db.refresh(session)

    # Déclencher alertes N8N en background (session DB indépendante)
    for stock_id in alertes_ids:
        background_tasks.add_task(_check_and_alert, stock_id)

    return schemas.ConfirmerSessionOut(
        session=session,
        mouvements_crees=mouvements_crees,
        alertes_declenchees=len(alertes_ids),
    )


@router.delete("/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    session = db.query(models.SessionIrrigation).filter(models.SessionIrrigation.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session introuvable")
    db.delete(session)
    db.commit()
    return {"message": "Session supprimée"}
