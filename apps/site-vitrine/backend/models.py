from pydantic import BaseModel, EmailStr
from typing import Optional

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None  # Champ optionnel, peut être None si non fourni
    message: str
