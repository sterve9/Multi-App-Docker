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
from .routers import fermes, parcelles, traitements, recoltes, stocks, mouvements, recommandations, bilan, sessions, ai, pdf, users

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


@app.on_event("startup")
def startup_event():
    """Create admin user from env vars if no users exist yet."""
    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0 and ADMIN_PASSWORD_HASH:
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
            db.query(models.Ferme).filter(models.Ferme.owner_id.is_(None)).update(
                {"owner_id": admin.id}
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
