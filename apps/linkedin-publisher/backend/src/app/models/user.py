"""
Modèle User - Utilisateurs du système
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Identité
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)

    # LinkedIn
    linkedin_profile_url = Column(String(500), nullable=True)

    # Relations
    posts = relationship("LinkedInPost", back_populates="user", lazy="select")

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
