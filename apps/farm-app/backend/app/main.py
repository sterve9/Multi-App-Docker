from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

from .database import engine, Base, get_db, SessionLocal
from .auth import verify_password, create_access_token, ADMIN_USERNAME, ADMIN_PASSWORD_HASH
from . import models, schemas
from .routers import fermes, parcelles, traitements, recoltes, stocks, mouvements, recommandations, bilan, sessions, ai, pdf, users, excel

# Crée toutes les tables au démarrage
Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="🌿 Farm Manager API",
    description="API de gestion des fermes agrumicoles",
    version="2.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://ferme.sterveshop.cloud")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(fermes.router)
app.include_router(parcelles.router)
app.include_router(traitements.router)
app.include_router(recoltes.router)
app.include_router(stocks.router)
app.include_router(mouvements.router)
app.include_router(recommandations.router)
app.include_router(bilan.router)
app.include_router(sessions.router)
app.include_router(ai.router)
app.include_router(pdf.router)
app.include_router(users.router)
app.include_router(excel.router)


@app.on_event("startup")
def startup_event():
    """Add owner_id column if missing, ensure enum values exist, create admin user from env vars if needed."""
    db = SessionLocal()
    try:
        from sqlalchemy import text as _text
        # Add owner_id column to fermes if it doesn't exist yet
        db.execute(_text(
            "ALTER TABLE fermes ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)"
        ))
        db.commit()

        # Ensure 'ingenieur' value exists in roleenum PostgreSQL type
        try:
            db.execute(_text("ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'ingenieur'"))
            db.commit()
        except Exception:
            db.rollback()

        # Create admin user if no users exist
        if db.query(models.User).count() == 0 and ADMIN_PASSWORD_HASH:
            from .auth import hash_password as _hp
            admin = models.User(
                username=ADMIN_USERNAME,
                password_hash=ADMIN_PASSWORD_HASH,
                nom="Administrateur",
                role=models.RoleEnum.admin,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            # Assign existing fermes (owner_id=NULL) to admin
            db.execute(
                _text("UPDATE fermes SET owner_id = :uid WHERE owner_id IS NULL"),
                {"uid": admin.id}
            )
            db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "🌿 Farm Manager API — opérationnelle", "version": "2.0.0"}


@app.post("/auth/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/health")
def health():
    return {"status": "ok"}
