from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # 🔐 Rôles
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 🔗 Relations SaaS
    blogs = relationship("Blog", back_populates="owner", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="owner", cascade="all, delete-orphan")