from pydantic import BaseModel, EmailStr
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


# ✅ AJOUTÉ : schéma retourné par GET /api/auth/me
class UserResponse(BaseModel):
    id: int
    email: str
    is_admin: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True