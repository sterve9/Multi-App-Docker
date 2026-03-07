from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, hash_password
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import Token, RegisterRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


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
        is_admin=False,
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

    ⚠️ NOTE : OAuth2PasswordRequestForm utilise le champ `username` pour l'email.
    Dans Swagger "Authorize" → mettre l'email dans le champ "username".
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
# ✅ ME — profil utilisateur connecté
# ===============================

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retourne le profil de l'utilisateur connecté.
    Utilisé par le frontend pour afficher le tableau de bord.
    - Authentification requise
    - Aucune donnée sensible exposée (pas de hashed_password)
    """
    return current_user