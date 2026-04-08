from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from .models import (
    VarieteEnum, StatutParcelleEnum, TypeTraitementEnum,
    QualiteRecolteEnum, CategorieStockEnum,
    PrioriteEnum, StatutRecommandationEnum, TypeMouvementEnum, StatutSessionEnum
)


# ─── AUTH ───────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str


# ─── FERME ──────────────────────────────────────────────
class FermeBase(BaseModel):
    nom: str
    localisation: Optional[str] = None
    surface_ha: Optional[float] = None
    nb_vannes: int = 1
    jours_irrigation: str = ""

class FermeCreate(FermeBase):
    pass

class FermeConfigUpdate(BaseModel):
    nb_vannes: Optional[int] = None
    jours_irrigation: Optional[str] = None

class FermeOut(FermeBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ─── PARCELLE ───────────────────────────────────────────
class ParcelleBase(BaseModel):
    nom: str
    ferme_id: int
    surface_ha: Optional[float] = None
    variete: VarieteEnum
    nb_arbres: Optional[int] = None
    annee_plantation: Optional[int] = None
    statut: StatutParcelleEnum = StatutParcelleEnum.active
    notes: Optional[str] = None

class ParcelleCreate(ParcelleBase):
    pass

class ParcelleUpdate(BaseModel):
    nom: Optional[str] = None
    surface_ha: Optional[float] = None
    variete: Optional[VarieteEnum] = None
    nb_arbres: Optional[int] = None
    annee_plantation: Optional[int] = None
    statut: Optional[StatutParcelleEnum] = None
    notes: Optional[str] = None

class ParcelleOut(ParcelleBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ─── TRAITEMENT ─────────────────────────────────────────
class TraitementBase(BaseModel):
    parcelle_id: int
    date: date
    type_traitement: TypeTraitementEnum
    produit: Optional[str] = None
    dose: Optional[float] = None
    unite: Optional[str] = None
    notes: Optional[str] = None
    stock_id: Optional[int] = None  # lien vers le stock utilisé (sortie auto)

class TraitementCreate(TraitementBase):
    pass

class TraitementOut(TraitementBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ─── RECOLTE ────────────────────────────────────────────
class RecolteBase(BaseModel):
    parcelle_id: int
    date: date
    quantite_kg: float
    qualite: Optional[QualiteRecolteEnum] = None
    destination: Optional[str] = None
    prix_kg: float = 0
    notes: Optional[str] = None

class RecolteCreate(RecolteBase):
    pass

class RecolteOut(RecolteBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ─── STOCK ──────────────────────────────────────────────
class StockBase(BaseModel):
    ferme_id: Optional[int] = None
    nom: str
    categorie: CategorieStockEnum
    quantite: float = 0
    unite: Optional[str] = None
    seuil_alerte: float = 0
    cout_unitaire: float = 0
    dose_par_vanne: float = 0
    dose_unite: str = "kg"
    notes: Optional[str] = None

class StockCreate(StockBase):
    pass

class StockUpdate(BaseModel):
    quantite: Optional[float] = None
    seuil_alerte: Optional[float] = None
    cout_unitaire: Optional[float] = None
    dose_par_vanne: Optional[float] = None
    dose_unite: Optional[str] = None
    notes: Optional[str] = None

class StockOut(StockBase):
    id: int
    created_at: datetime
    alerte_active: bool = False
    date_rupture_estimee: Optional[str] = None   # ex: "15 mai 2026"
    jours_avant_rupture: Optional[int] = None    # nb jours restants
    consommation_hebdo: Optional[float] = None   # kg ou L par semaine
    class Config:
        from_attributes = True


# ─── MOUVEMENT STOCK ────────────────────────────────────
class MouvementBase(BaseModel):
    stock_id: int
    type_mouvement: TypeMouvementEnum
    quantite: float
    cout_unitaire: float = 0
    notes: Optional[str] = None

class MouvementCreate(MouvementBase):
    pass

class MouvementOut(MouvementBase):
    id: int
    date: datetime
    class Config:
        from_attributes = True


# ─── RECOMMANDATION ─────────────────────────────────────
class RecommandationBase(BaseModel):
    ferme_id: int
    auteur: str = "Ingénieur"
    contenu: str
    priorite: PrioriteEnum = PrioriteEnum.normale
    statut: StatutRecommandationEnum = StatutRecommandationEnum.en_attente

class RecommandationCreate(RecommandationBase):
    pass

class RecommandationUpdate(BaseModel):
    auteur: Optional[str] = None
    contenu: Optional[str] = None
    priorite: Optional[PrioriteEnum] = None
    statut: Optional[StatutRecommandationEnum] = None

class RecommandationOut(RecommandationBase):
    id: int
    date: datetime
    ferme: FermeOut
    class Config:
        from_attributes = True


# ─── BILAN SAISON ───────────────────────────────────────
class DepenseItem(BaseModel):
    stock_nom: str
    categorie: str
    cout_total: float

class BilanSaison(BaseModel):
    ferme: FermeOut
    annee: int
    total_recolte_kg: float
    total_recolte_valeur: float
    total_couts: float
    marge_brute: float
    nb_recoltes: int
    nb_traitements: int
    top_depenses: List[DepenseItem]


# ─── DASHBOARD ──────────────────────────────────────────
class DashboardFerme(BaseModel):
    ferme: FermeOut
    nb_parcelles: int
    nb_arbres_total: int
    recolte_total_kg: float
    dernier_traitement: Optional[date] = None
    stocks_alerte: int


# ─── SESSION IRRIGATION ─────────────────────────────────
class ProduitSession(BaseModel):
    stock_id: int
    nom: str
    unite: Optional[str]
    dose_unite: str
    dose_par_vanne: float
    qte_deduite: float
    quantite_actuelle: float
    semaines_restantes: Optional[float]
    en_alerte: bool

class SessionPlanifiee(BaseModel):
    date: date
    jour_semaine: str
    produits: List[ProduitSession]
    session_id: Optional[int] = None
    statut: Optional[str] = None

class PlanningFerme(BaseModel):
    ferme_id: int
    ferme_nom: str
    nb_vannes: int
    jours_irrigation: str
    sessions: List[SessionPlanifiee]

class SessionCreate(BaseModel):
    ferme_id: int
    date: date
    notes: Optional[str] = None

class SessionOut(BaseModel):
    id: int
    ferme_id: int
    date: date
    statut: StatutSessionEnum
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class ConfirmerSessionOut(BaseModel):
    session: SessionOut
    mouvements_crees: int
    alertes_declenchees: int


# ─── AI CHAT ────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    ferme_id: int
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str

class AnalyseResponse(BaseModel):
    nb_recommandations: int
    recommandations: List[str]
