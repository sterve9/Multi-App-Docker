import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def send_alert_email(stock_nom: str, quantite: float, unite: str, seuil: float, ferme_nom: str) -> bool:
    """
    Envoie un email d'alerte au fournisseur quand un stock atteint son seuil.
    Retourne True si l'envoi réussit, False sinon (sans lever d'exception).
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    fournisseur_email = os.getenv("FOURNISSEUR_EMAIL")

    if not all([smtp_host, smtp_user, smtp_pass, fournisseur_email]):
        logger.warning("Email non configuré — variables SMTP manquantes dans .env")
        return False

    unite_str = unite or "unité(s)"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[ALERTE STOCK] Réapprovisionner {stock_nom} — {ferme_nom}"
    msg["From"] = smtp_from
    msg["To"] = fournisseur_email

    texte = f"""
ALERTE RÉAPPROVISIONNEMENT — {ferme_nom}

Le produit "{stock_nom}" a atteint son seuil d'alerte.

  Quantité actuelle : {quantite} {unite_str}
  Seuil configuré   : {seuil} {unite_str}

Merci de procéder au réapprovisionnement dans les meilleurs délais.

---
Farm Manager — Système de gestion agrumicole
    """.strip()

    html = f"""
<html><body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;">
  <div style="background:#dc2626;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
    <h2 style="margin:0;font-size:18px;">⚠️ Alerte Réapprovisionnement</h2>
    <p style="margin:4px 0 0;opacity:.9;font-size:14px;">{ferme_nom}</p>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <p>Le produit <strong>"{stock_nom}"</strong> a atteint son seuil d'alerte :</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#fef2f2;">
        <td style="padding:10px 16px;border:1px solid #fecaca;font-weight:600;">Quantité actuelle</td>
        <td style="padding:10px 16px;border:1px solid #fecaca;color:#dc2626;font-weight:700;">{quantite} {unite_str}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e2e8f0;">Seuil d'alerte</td>
        <td style="padding:10px 16px;border:1px solid #e2e8f0;">{seuil} {unite_str}</td>
      </tr>
    </table>
    <p style="color:#64748b;font-size:13px;">Merci de procéder au réapprovisionnement dans les meilleurs délais.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">Farm Manager — Système de gestion agrumicole</p>
  </div>
</body></html>
    """.strip()

    msg.attach(MIMEText(texte, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        logger.info(f"Email alerte envoyé pour {stock_nom} ({ferme_nom}) → {fournisseur_email}")
        return True
    except Exception as e:
        logger.error(f"Échec envoi email alerte : {e}")
        return False
