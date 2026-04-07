import httpx
import os
import logging

logger = logging.getLogger(__name__)

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_STOCK_ALERTE", "")


def trigger_stock_alerte(stock_nom: str, quantite: float, unite: str, seuil: float, ferme_nom: str) -> bool:
    """
    Envoie un webhook N8N quand un stock atteint son seuil d'alerte.
    N8N gère ensuite : email fournisseur, WhatsApp, logs, etc.
    Retourne True si succès, False sinon (sans lever d'exception).
    """
    if not N8N_WEBHOOK_URL:
        logger.warning("N8N_WEBHOOK_STOCK_ALERTE non configuré dans .env — alerte ignorée")
        return False

    payload = {
        "event": "stock_alerte",
        "ferme": ferme_nom,
        "produit": stock_nom,
        "quantite_actuelle": quantite,
        "seuil_alerte": seuil,
        "unite": unite or "unité(s)",
        "message": f"[ALERTE STOCK] {stock_nom} ({ferme_nom}) : {quantite} {unite or 'unités'} — seuil {seuil}",
    }

    try:
        with httpx.Client(timeout=5.0) as client:
            r = client.post(N8N_WEBHOOK_URL, json=payload)
            r.raise_for_status()
        logger.info(f"Webhook N8N déclenché pour {stock_nom} ({ferme_nom})")
        return True
    except Exception as e:
        logger.error(f"Échec webhook N8N alerte stock : {e}")
        return False
