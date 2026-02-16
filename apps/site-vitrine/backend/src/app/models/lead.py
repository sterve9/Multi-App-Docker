from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    # Client
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)

    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)

    # Analyse
    category = Column(String(50), nullable=False)
    intent = Column(String(255), nullable=True)
    priority = Column(String(20), nullable=False)
    priority_score = Column(Integer, nullable=False)
    summary = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)

    # Meta
    source = Column(String(50), default="website")
    status = Column(String(50), default="new")
    response_required = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
