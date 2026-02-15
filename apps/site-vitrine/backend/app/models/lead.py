from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)

    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)

    category = Column(String(50), nullable=True)
    priority = Column(String(20), nullable=True)
    priority_score = Column(Integer, nullable=True)
    next_action = Column(String(255), nullable=True)

    source = Column(String(50), default="website")
    status = Column(String(50), default="new")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
