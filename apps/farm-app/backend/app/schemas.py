from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from .models import VarieteEnum, StatutParcelleEnum, TypeTraitementEnum, QualiteRecolteEnum, CategorieStockEnum


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

class FermeCreate(FermeBase):
    pass

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
    nom: str
    categorie: CategorieStockEnum
    quantite: float = 0
    unite: Optional[str] = None
    seuil_alerte: float = 0
    notes: Optional[str] = None

class StockCreate(StockBase):
    pass

class StockUpdate(BaseModel):
    quantite: Optional[float] = None
    seuil_alerte: Optional[float] = None
    notes: Optional[str] = None

class StockOut(StockBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ─── DASHBOARD ──────────────────────────────────────────
class DashboardFerme(BaseModel):
    ferme: FermeOut
    nb_parcelles: int
    nb_arbres_total: int
    recolte_total_kg: float
    dernier_traitement: Optional[date] = None
    stocks_alerte: int
