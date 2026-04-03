from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

from .database import engine, Base, get_db
from .auth import verify_password, create_access_token, ADMIN_USERNAME, ADMIN_PASSWORD_HASH
from . import models, schemas
from .routers import fermes, parcelles, traitements, recoltes, stocks

# Crée toutes les tables au démarrage
Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="🌿 Farm Manager API",
    description="API de gestion des fermes agrumicoles",
    version="1.0.0"
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


@app.get("/")
def root():
    return {"message": "🌿 Farm Manager API — opérationnelle", "version": "1.0.0"}


@app.post("/auth/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, body: schemas.LoginRequest, db: Session = Depends(get_db)):
    if not ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=503, detail="Configuration serveur incomplète")

    if body.username != ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    if not verify_password(body.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    token = create_access_token({"sub": body.username})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/health")
def health():
    return {"status": "ok"}
