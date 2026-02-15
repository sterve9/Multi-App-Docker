from pydantic import BaseModel, EmailStr
from typing import Optional


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str
