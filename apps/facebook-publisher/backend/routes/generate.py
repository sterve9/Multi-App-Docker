from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.video import ScriptRequest, ScriptResponse, VideoGenerationRequest, VideoStatus
from services.claude_service import generate_script
from services.elevenlabs_service import generate_voiceover
from services.kieai_service import generate_multiple_images
from services.ffmpeg_service import assemble_video
from services.remotion_service import render_video as remotion_render
import uuid, os, asyncio

router = APIRouter()

# Stockage en mémoire des jobs (Redis en Phase 2)
jobs: dict[str, VideoStatus] = {}

STORAGE_PATH = "/app/storage"

# Nombre d'images générées selon la durée
IMAGES_BY_DURATION = {
    "15": 2,   # 2 images × ~7.5s chacune
    "30": 3,   # 3 images × ~10s chacune
    "60": 5,   # 5 images × ~12s chacune
}

@router.post("/script", response_model=ScriptResponse)
async def create_script(request: ScriptRequest):
    """Génère script + captions + tags via Claude"""
    try:
        result = await generate_script(request.theme, request.format, request.duration)
        return ScriptResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/video", response_model=VideoStatus)
async def create_video(request: VideoGenerationRequest, background_tasks: BackgroundTasks):
    """Lance la génération vidéo en arrière-plan"""
    video_id = str(uuid.uuid4())
    job = VideoStatus(video_id=video_id, status="pending", progress=0, message="En attente...")
    jobs[video_id] = job

    background_tasks.add_task(process_video, video_id, request)
    return job

@router.get("/status/{video_id}", response_model=VideoStatus)
async def get_status(video_id: str):
    """Retourne le statut du job en cours"""
    if video_id not in jobs:
        raise HTTPException(status_code=404, detail="Job introuvable")
    return jobs[video_id]

async def process_video(video_id: str, request: VideoGenerationRequest):
    """Pipeline complet de génération vidéo"""
    job = jobs[video_id]
    duration = int(request.duration)

    try:
        temp_dir = f"{STORAGE_PATH}/temp/{video_id}"
        os.makedirs(temp_dir, exist_ok=True)

        audio_path  = f"{STORAGE_PATH}/audio/{video_id}.mp3"
        output_path = f"{STORAGE_PATH}/videos/{video_id}.mp4"

        # Prompt visuel de base
        visual_prompt = (
            f"Cinematic vertical 9:16 TikTok visual, {request.hook}, "
            "warm golden tones, African wellness aesthetic, "
            "natural herbs honey ginger, dramatic lighting, no text, no watermark"
        )

        # ── Étape 1 : Voix off ───────────────────────────────────────────────
        job.status = "processing"
        job.progress = 10
        job.message = "Génération de la voix off..."
        await generate_voiceover(request.script, audio_path)

        # ── Étape 2 : Visuels ────────────────────────────────────────────────
        job.progress = 30
        job.message = "Génération des visuels IA..."

        if request.format == "video_ia":
            # Génération images Flux-2 Pro + rendu Remotion (remplace Kling 3.0)
            nb_images = IMAGES_BY_DURATION.get(request.duration, 3)
            job.message = f"Génération de {nb_images} visuels IA (Flux-2 Pro)..."
            image_paths = await generate_multiple_images(
                base_prompt=visual_prompt,
                output_dir=f"{STORAGE_PATH}/images",
                video_id=video_id,
                count=nb_images,
            )

            # ── Étape 3 : Rendu Remotion ─────────────────────────────────────
            job.progress = 70
            job.message = "Rendu Remotion (captions animées + Ken Burns)..."
            await remotion_render(
                video_id=video_id,
                audio_path=audio_path,
                captions=request.captions,
                image_paths=image_paths,
                duration_seconds=duration,
            )

        else:
            # Plusieurs images en parallèle
            nb_images = IMAGES_BY_DURATION.get(request.duration, 3)
            job.message = f"Génération de {nb_images} visuels IA en parallèle..."
            image_paths = await generate_multiple_images(
                base_prompt=visual_prompt,
                output_dir=f"{STORAGE_PATH}/images",
                video_id=video_id,
                count=nb_images,
            )
            visuals = image_paths  # list → assemble_video détecte automatiquement

            # ── Étape 3 : Assemblage FFmpeg ───────────────────────────────────
            job.progress = 70
            job.message = "Assemblage vidéo + transitions + sous-titres..."
            await assemble_video(audio_path, visuals, request.captions, output_path, duration)

        # ── Done ─────────────────────────────────────────────────────────────
        job.status = "done"
        job.progress = 100
        job.message = "Vidéo prête !"
        job.video_url = f"/videos/{video_id}.mp4"

    except Exception as e:
        job.status = "error"
        job.message = str(e)
        job.progress = 0