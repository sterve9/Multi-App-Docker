from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.generate import router as generate_router
from routes.video import router as video_router
from core.database import engine, Base

import models.db_video  # noqa: F401
import os

app = FastAPI(title="TikTok Publisher API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables créées avec succès")

    os.makedirs("/app/storage/videos", exist_ok=True)
    os.makedirs("/app/storage/audio", exist_ok=True)
    os.makedirs("/app/storage/images", exist_ok=True)
    os.makedirs("/app/storage/temp", exist_ok=True)


app.include_router(generate_router, prefix="/api", tags=["Génération"])
app.include_router(video_router, prefix="/api", tags=["Vidéo"])

app.mount("/videos", StaticFiles(directory="/app/storage/videos"), name="videos")


@app.get("/")
def health():
    return {"status": "ok", "service": "TikTok Publisher Backend"}
