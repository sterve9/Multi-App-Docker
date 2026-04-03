from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class VarieteEnum(str, enum.Enum):
    citron = "citron"
    orange = "orange"
    clementine = "clementine"
    mixte = "mixte"


class StatutParcelleEnum(str, enum.Enum):
    active = "active"
    repos = "repos"
    replantation = "replantation"


class TypeTraitementEnum(str, enum.Enum):
    pesticide = "pesticide"
    engrais = "engrais"
    irrigation = "irrigation"
    taille = "taille"
    autre = "autre"


class QualiteRecolteEnum(str, enum.Enum):
    premiere = "1ere catégorie"
    deuxieme = "2eme catégorie"
    mixte = "mixte"


class CategorieStockEnum(str, enum.Enum):
    pesticide = "pesticide"
    engrais = "engrais"
    materiel = "matériel"
    autre = "autre"


class Ferme(Base):
    __tablename__ = "fermes"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    localisation = Column(String(200))
    surface_ha = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parcelles = relationship("Parcelle", back_populates="ferme", cascade="all, delete-orphan")


class Parcelle(Base):
    __tablename__ = "parcelles"
    id = Column(Integer, primary_key=True, index=True)
    ferme_id = Column(Integer, ForeignKey("fermes.id"), nullable=False)
    nom = Column(String(100), nullable=False)
    surface_ha = Column(Float)
    variete = Column(Enum(VarieteEnum), nullable=False)
    nb_arbres = Column(Integer)
    annee_plantation = Column(Integer)
    statut = Column(Enum(StatutParcelleEnum), default=StatutParcelleEnum.active)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ferme = relationship("Ferme", back_populates="parcelles")
    traitements = relationship("Traitement", back_populates="parcelle", cascade="all, delete-orphan")
    recoltes = relationship("Recolte", back_populates="parcelle", cascade="all, delete-orphan")


class Traitement(Base):
    __tablename__ = "traitements"
    id = Column(Integer, primary_key=True, index=True)
    parcelle_id = Column(Integer, ForeignKey("parcelles.id"), nullable=False)
    date = Column(Date, nullable=False)
    type_traitement = Column(Enum(TypeTraitementEnum), nullable=False)
    produit = Column(String(200))
    dose = Column(Float)
    unite = Column(String(20))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parcelle = relationship("Parcelle", back_populates="traitements")


class Recolte(Base):
    __tablename__ = "recoltes"
    id = Column(Integer, primary_key=True, index=True)
    parcelle_id = Column(Integer, ForeignKey("parcelles.id"), nullable=False)
    date = Column(Date, nullable=False)
    quantite_kg = Column(Float, nullable=False)
    qualite = Column(Enum(QualiteRecolteEnum))
    destination = Column(String(200))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parcelle = relationship("Parcelle", back_populates="recoltes")


class Stock(Base):
    __tablename__ = "stocks"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(200), nullable=False)
    categorie = Column(Enum(CategorieStockEnum), nullable=False)
    quantite = Column(Float, default=0)
    unite = Column(String(20))
    seuil_alerte = Column(Float, default=0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
