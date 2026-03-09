from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, hash_password
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import Token, RegisterRequest, UserResponse, UpdateProfileRequest, QuotaResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Limite mensuelle par plan
PLAN_LIMITS = {
    "free": 3,
    "pro": 999999,
}


# ===============================
# REGISTER
# ===============================

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """
    Créer un nouveau compte utilisateur.
    - email doit être unique
    - password est hashé avant stockage
    - is_admin = False par défaut (sécurité)
    """
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    new_user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        is_admin=False,
        plan="free",
        generation_count=0,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Account created successfully",
        "email": new_user.email,
    }


# ===============================
# LOGIN
# ===============================

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login endpoint — compatible Swagger OAuth2 + clients JSON via form-data.
    ⚠️ OAuth2PasswordRequestForm utilise le champ `username` pour l'email.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={
            "sub": user.email,
            "is_admin": user.is_admin,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# ===============================
# ME — profil utilisateur connecté
# ===============================

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
    return current_user


# ===============================
# UPDATE ME — modifier profil
# ===============================

@router.put("/me", response_model=UserResponse)
def update_me(
    data: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Modifier le profil : nom et/ou mot de passe."""
    if data.full_name is not None:
        current_user.full_name = data.full_name

    if data.password is not None:
        if len(data.password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le mot de passe doit contenir au moins 8 caractères",
            )
        current_user.hashed_password = hash_password(data.password)

    db.commit()
    db.refresh(current_user)
    return current_user


# ===============================
# QUOTA — générations restantes
# ===============================

@router.get("/quota", response_model=QuotaResponse)
def get_quota(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retourne le quota de générations restantes pour le mois en cours."""
    now = datetime.now(timezone.utc)

    # Reset si on a changé de mois
    if current_user.generation_reset:
        reset_dt = current_user.generation_reset
        if reset_dt.tzinfo is None:
            reset_dt = reset_dt.replace(tzinfo=timezone.utc)
        if now >= reset_dt:
            current_user.generation_count = 0
            # Prochain reset = 1er du mois prochain
            if now.month == 12:
                next_reset = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                next_reset = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
            current_user.generation_reset = next_reset
            db.commit()
            db.refresh(current_user)

    limit = PLAN_LIMITS.get(current_user.plan, 3)
    remaining = max(0, limit - current_user.generation_count)

    return QuotaResponse(
        plan=current_user.plan,
        generation_count=current_user.generation_count,
        generation_limit=limit,
        remaining=remaining,
        reset_at=current_user.generation_reset,
    )