from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os

from .database import engine, Base, get_db
from .auth import verify_password, create_access_token, hash_password
from . import models, schemas
from .routers import fermes, parcelles, traitements, recoltes, stocks

# Crée toutes les tables au démarrage
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="🌿 Farm Manager API",
    description="API de gestion des fermes agrumicoles",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    admin_username = os.getenv("ADMIN_USERNAME", "patron")
    admin_password_hash = os.getenv("ADMIN_PASSWORD_HASH", "")

    if request.username != admin_username:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    if not admin_password_hash or not verify_password(request.password, admin_password_hash):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    token = create_access_token({"sub": request.username})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/health")
def health():
    return {"status": "ok"}
