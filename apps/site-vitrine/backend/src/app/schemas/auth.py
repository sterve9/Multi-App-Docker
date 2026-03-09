from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    is_admin: bool
    is_active: bool
    plan: str = "free"
    generation_count: int = 0
    generation_reset: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class QuotaResponse(BaseModel):
    plan: str
    generation_count: int
    generation_limit: int
    remaining: int
    reset_at: Optional[datetime] = None