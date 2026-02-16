from sqlalchemy import Column, Integer, String, Text, Boolean
from app.database import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    # Contact
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    message = Column(Text, nullable=False)

    # Qualification
    category = Column(String, default="contact")
    intent = Column(String, nullable=True)

    priority = Column(String, default="medium")
    priority_score = Column(Integer, default=50)

    summary = Column(Text, nullable=True)
    next_action = Column(String, nullable=True)

    source = Column(String, default="website")
    status = Column(String, default="new")

    response_required = Column(Boolean, default=True)
