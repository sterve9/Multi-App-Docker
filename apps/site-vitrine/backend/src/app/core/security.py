from datetime import datetime, timedelta
from typing import Optional

import hashlib
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings          # ✅ AJOUTÉ : lecture depuis config
from app.models.user import User

# ===============================
# CONFIG
# ===============================

# ✅ SUPPRIMÉ : SECRET_KEY = "CHANGE_THIS_IN_PRODUCTION"  (était hardcodé)
# ✅ SUPPRIMÉ : ALGORITHM = "HS256"                        (était hardcodé)
# ✅ SUPPRIMÉ : ACCESS_TOKEN_EXPIRE_MINUTES = 60           (était hardcodé)
# Ces 3 valeurs viennent maintenant de settings (config.py → .env)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ===============================
# PASSWORD MANAGEMENT
# ===============================

def _pre_hash_password(password: str) -> str:
    """
    Pre-hash with SHA256 to avoid bcrypt 72-byte limitation.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    """
    Hash password using SHA256 + bcrypt.
    """
    pre_hashed = _pre_hash_password(password)
    return pwd_context.hash(pre_hashed)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password using same SHA256 + bcrypt pipeline.
    """
    pre_hashed = _pre_hash_password(plain_password)
    return pwd_context.verify(pre_hashed, hashed_password)

# ===============================
# JWT MANAGEMENT
# ===============================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)  # ✅ depuis settings

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)  # ✅ depuis settings


def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])  # ✅ depuis settings
        return payload
    except JWTError:
        return None

# ===============================
# DEPENDENCIES (SaaS Security Layer)
# ===============================

def get_current_user(
    token: str = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Extract user from JWT and validate existence in database.
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
):
    """
    Ensure user has admin privileges.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    return current_user