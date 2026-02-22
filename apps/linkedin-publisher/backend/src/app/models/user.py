"""
Modèle User - Utilisateurs du système
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    """
    Table users
    Stocke les informations des utilisateurs
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    
    # Identité
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    
    # LinkedIn
    linkedin_profile_url = Column(String(500), nullable=True)
    
    # Buffer API
    buffer_access_token = Column(String(500), nullable=True)
    buffer_profile_id = Column(String(255), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
