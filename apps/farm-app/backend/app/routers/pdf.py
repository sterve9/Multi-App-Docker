from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import extract
from io import BytesIO
from datetime import date
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/pdf", tags=["pdf"])

_MOIS = ["", "janvier", "février", "mars", "avril", "mai", "juin",
         "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def _build_bilan(ferme_id: int, annee: int, db: Session) -> dict:
    ferme = db.query(models.Ferme).filter(models.Ferme.id == ferme_id).first()
    if not ferme:
        raise HTTPException(status_code=404, detail="Ferme introuvable")

    parcelle_ids = [p.id for p in ferme.parcelles]

    recoltes = []
    if parcelle_ids:
        recoltes = db.query(models.Recolte).filter(
            models.Recolte.parcelle_id.in_(parcelle_ids),
            extract("year", models.Recolte.date) == annee
        ).order_by(models.Recolte.date).all()

    nb_traitements = 0
    if parcelle_ids:
        nb_traitements = db.query(models.Traitement).filter(
            models.Traitement.parcelle_id.in_(parcelle_ids),
            extract("year", models.Traitement.date) == annee
        ).count()

    stock_ids = [s.id for s in ferme.stocks]
    mouvements = []
    if stock_ids:
        mouvements = db.query(models.MouvementStock).filter(
            models.MouvementStock.stock_id.in_(stock_ids),
            models.MouvementStock.type_mouvement == models.TypeMouvementEnum.entree,
            extract("year", models.MouvementStock.date) == annee
        ).all()

    total_recolte_kg = sum(r.quantite_kg for r in recoltes)
    total_recolte_valeur = sum(r.quantite_kg * (r.prix_kg or 0) for r in recoltes)
    total_couts = sum(m.quantite * (m.cout_unitaire or 0) for m in mouvements)
    marge_brute = total_recolte_valeur - total_couts

    couts_par_stock: dict = {}
    for m in mouvements:
        stock = db.query(models.Stock).filter(models.Stock.id == m.stock_id).first()
        if stock:
            key = stock.id
            if key not in couts_par_stock:
                couts_par_stock[key] = {"nom": stock.nom, "categorie": stock.categorie.value, "total": 0}
            couts_par_stock[key]["total"] += m.quantite * (m.cout_unitaire or 0)

    top_depenses = sorted(couts_par_stock.values(), key=lambda x: x["total"], reverse=True)

    recommandations = db.query(models.Recommandation).filter(
        models.Recommandation.ferme_id == ferme_id
    ).order_by(models.Recommandation.date.desc()).limit(10).all()

    return {
        "ferme": ferme,
        "annee": annee,
        "parcelles": ferme.parcelles,
        "recoltes": recoltes,
        "nb_traitements": nb_traitements,
        "total_recolte_kg": round(total_recolte_kg, 1),
        "total_recolte_valeur": round(total_recolte_valeur, 1),
        "total_couts": round(total_couts, 1),
        "marge_brute": round(marge_brute, 1),
        "top_depenses": top_depenses,
        "recommandations": recommandations,
    }


def _generate_pdf(data: dict) -> BytesIO:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=20*mm, bottomMargin=20*mm)

    # Couleurs
    VERT = colors.HexColor("#059669")
    VERT_CLAIR = colors.HexColor("#d1fae5")
    ROUGE = colors.HexColor("#dc2626")
    ROUGE_CLAIR = colors.HexColor("#fee2e2")
    SLATE = colors.HexColor("#334155")
    SLATE_LIGHT = colors.HexColor("#f8fafc")
    SLATE_BORDER = colors.HexColor("#e2e8f0")

    styles = getSampleStyleSheet()
    story = []

    # ── En-tête ─────────────────────────────────────────────
    header_data = [[
        Paragraph(f'<font size="18" color="#ffffff"><b>🌿 Farm Manager</b></font>', styles["Normal"]),
        Paragraph(f'<font size="10" color="#bbf7d0">Rapport de saison {data["annee"]}<br/>'
                  f'Généré le {date.today().day} {_MOIS[date.today().month]} {date.today().year}</font>',
                  ParagraphStyle("r", parent=styles["Normal"], alignment=TA_RIGHT)),
    ]]
    header_tbl = Table(header_data, colWidths=[90*mm, 80*mm])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), VERT),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("PADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 8*mm))

    # ── Infos ferme ──────────────────────────────────────────
    ferme = data["ferme"]
    infos = [
        [Paragraph(f'<font size="14" color="#1e293b"><b>{ferme.nom}</b></font>', styles["Normal"]),
         Paragraph(f'<font size="10" color="#64748b">{ferme.localisation or ""} · {ferme.surface_ha or "?"} ha · {len(data["parcelles"])} parcelles</font>', styles["Normal"])],
    ]
    info_tbl = Table(infos, colWidths=[90*mm, 80*mm])
    info_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SLATE_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, SLATE_BORDER),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(info_tbl)
    story.append(Spacer(1, 6*mm))

    # ── KPIs ────────────────────────────────────────────────
    def kpi_cell(label, value, unit="", color=VERT):
        return Paragraph(
            f'<font size="9" color="#64748b">{label}</font><br/>'
            f'<font size="16" color="{color.hexval() if hasattr(color,"hexval") else "#059669"}"><b>{value}</b></font>'
            f'<font size="9" color="#94a3b8"> {unit}</font>',
            styles["Normal"]
        )

    def hex_str(c):
        return "#%02x%02x%02x" % (int(c.red*255), int(c.green*255), int(c.blue*255))

    kpis = [[
        kpi_cell("Récoltes totales", f'{data["total_recolte_kg"]:,.0f}'.replace(",", " "), "kg"),
        kpi_cell("Valeur récoltes", f'{data["total_recolte_valeur"]:,.0f}'.replace(",", " "), "TND"),
        kpi_cell("Dépenses totales", f'{data["total_couts"]:,.0f}'.replace(",", " "), "TND", ROUGE),
        kpi_cell("Marge brute", f'{data["marge_brute"]:,.0f}'.replace(",", " "), "TND",
                 VERT if data["marge_brute"] >= 0 else ROUGE),
    ]]
    kpi_tbl = Table(kpis, colWidths=[42*mm, 42*mm, 42*mm, 42*mm])
    kpi_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SLATE_LIGHT),
        ("BOX", (0, 0), (0, 0), 0.5, SLATE_BORDER),
        ("BOX", (1, 0), (1, 0), 0.5, SLATE_BORDER),
        ("BOX", (2, 0), (2, 0), 0.5, SLATE_BORDER),
        ("BOX", (3, 0), (3, 0), 0.5, SLATE_BORDER),
        ("PADDING", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(kpi_tbl)
    story.append(Spacer(1, 6*mm))

    # ── Récoltes détail ──────────────────────────────────────
    if data["recoltes"]:
        story.append(Paragraph('<font size="11" color="#1e293b"><b>📦 Détail des récoltes</b></font>', styles["Normal"]))
        story.append(Spacer(1, 3*mm))
        rec_rows = [["Date", "Quantité (kg)", "Qualité", "Prix/kg (TND)", "Valeur (TND)"]]
        for r in data["recoltes"]:
            valeur = r.quantite_kg * (r.prix_kg or 0)
            rec_rows.append([
                str(r.date),
                f"{r.quantite_kg:,.1f}".replace(",", " "),
                r.qualite.value if r.qualite else "—",
                f"{r.prix_kg:.3f}" if r.prix_kg else "—",
                f"{valeur:,.0f}".replace(",", " "),
            ])
        rec_rows.append(["TOTAL", f"{data['total_recolte_kg']:,.1f}".replace(",", " "), "", "",
                          f"{data['total_recolte_valeur']:,.0f}".replace(",", " ")])

        rec_tbl = Table(rec_rows, colWidths=[30*mm, 32*mm, 32*mm, 32*mm, 32*mm])
        rec_style = [
            ("BACKGROUND", (0, 0), (-1, 0), VERT),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.3, SLATE_BORDER),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, SLATE_LIGHT]),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("BACKGROUND", (0, -1), (-1, -1), VERT_CLAIR),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ]
        rec_tbl.setStyle(TableStyle(rec_style))
        story.append(rec_tbl)
        story.append(Spacer(1, 6*mm))

    # ── Top dépenses ─────────────────────────────────────────
    if data["top_depenses"]:
        story.append(Paragraph('<font size="11" color="#1e293b"><b>💸 Top dépenses par produit</b></font>', styles["Normal"]))
        story.append(Spacer(1, 3*mm))
        dep_rows = [["Produit", "Catégorie", "Coût total (TND)", "% du total"]]
        for d in data["top_depenses"]:
            pct = (d["total"] / data["total_couts"] * 100) if data["total_couts"] > 0 else 0
            dep_rows.append([
                d["nom"],
                d["categorie"],
                f"{d['total']:,.0f}".replace(",", " "),
                f"{pct:.1f}%",
            ])
        dep_tbl = Table(dep_rows, colWidths=[60*mm, 35*mm, 40*mm, 30*mm])
        dep_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), SLATE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.3, SLATE_BORDER),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SLATE_LIGHT]),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(dep_tbl)
        story.append(Spacer(1, 6*mm))

    # ── Résumé parcelles ─────────────────────────────────────
    if data["parcelles"]:
        story.append(Paragraph('<font size="11" color="#1e293b"><b>🗺️ Parcelles</b></font>', styles["Normal"]))
        story.append(Spacer(1, 3*mm))
        parc_rows = [["Nom", "Variété", "Arbres", "Surface (ha)", "Statut"]]
        for p in data["parcelles"]:
            parc_rows.append([
                p.nom,
                p.variete.value,
                str(p.nb_arbres or "—"),
                str(p.surface_ha or "—"),
                p.statut.value,
            ])
        parc_tbl = Table(parc_rows, colWidths=[40*mm, 35*mm, 25*mm, 30*mm, 30*mm])
        parc_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), SLATE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.3, SLATE_BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SLATE_LIGHT]),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(parc_tbl)
        story.append(Spacer(1, 6*mm))

    # ── Recommandations ──────────────────────────────────────
    if data["recommandations"]:
        story.append(Paragraph('<font size="11" color="#1e293b"><b>📋 Recommandations</b></font>', styles["Normal"]))
        story.append(Spacer(1, 3*mm))
        PRIO_COLOR = {"haute": "#dc2626", "normale": "#d97706", "basse": "#059669"}
        for rec in data["recommandations"]:
            color = PRIO_COLOR.get(rec.priorite.value, "#64748b")
            story.append(Paragraph(
                f'<font size="8" color="{color}"><b>[{rec.priorite.value.upper()}]</b></font>'
                f' <font size="8" color="#334155">{rec.contenu}</font>'
                f' <font size="7" color="#94a3b8">— {rec.auteur}</font>',
                styles["Normal"]
            ))
            story.append(Spacer(1, 1.5*mm))
        story.append(Spacer(1, 4*mm))

    # ── Pied de page ─────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_BORDER))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f'<font size="7" color="#94a3b8">Farm Manager · ferme.sterveshop.cloud · '
        f'Rapport généré le {date.today().day} {_MOIS[date.today().month]} {date.today().year} · '
        f'{data["annee"]} · Développé par Sterve</font>',
        ParagraphStyle("footer", parent=styles["Normal"], alignment=TA_CENTER)
    ))

    doc.build(story)
    buf.seek(0)
    return buf


@router.get("/bilan/{ferme_id}")
def download_bilan_pdf(
    ferme_id: int,
    annee: int = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if annee is None:
        annee = date.today().year
    data = _build_bilan(ferme_id, annee, db)
    ferme_nom = data["ferme"].nom.replace(" ", "_")
    pdf_buf = _generate_pdf(data)
    filename = f"bilan_{ferme_nom}_{annee}.pdf"
    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
