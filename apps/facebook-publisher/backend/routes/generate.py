from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.video import ScriptRequest, ScriptResponse, VideoGenerationRequest, VideoStatus
from services.claude_service import generate_script
from services.elevenlabs_service import generate_voiceover
from services.kieai_service import generate_multiple_images, generate_video_veo3
from services.ffmpeg_service import assemble_video, add_subtitles_to_video
import uuid, os

router = APIRouter()

# Stockage en mémoire des jobs
jobs: dict[str, VideoStatus] = {}

STORAGE_PATH = "/app/storage"

# Nombre d'images pour le format standard
IMAGES_BY_DURATION = {
    "15": 2,
    "30": 3,
    "60": 5,
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
        os.makedirs(f"{STORAGE_PATH}/audio", exist_ok=True)
        os.makedirs(f"{STORAGE_PATH}/images", exist_ok=True)
        os.makedirs(f"{STORAGE_PATH}/videos", exist_ok=True)

        output_path = f"{STORAGE_PATH}/videos/{video_id}.mp4"

        if request.format == "video_ia":
            # ── VEO3 — vidéo + voix en une seule étape ──────────────────────
            job.status = "processing"
            job.progress = 20
            job.message = "Génération vidéo Veo3 (voix + visuels intégrés)..."

            # Prompt visuel pour l'avatar
            visual_prompt = (
                "African man 45-50 years old, wise and calm expression, "
                "traditional setting, warm golden candlelight, "
                "natural herbs honey ginger cinnamon visible, "
                "authentic African wellness atmosphere, "
                "speaking directly to camera, photorealistic, cinematic"
            )

            # Script à intégrer dans la vidéo
            script_text = request.script[:500]  # Veo3 limite le prompt

            veo3_raw_path = os.path.join(temp_dir, f"{video_id}_veo3_raw.mp4")

            await generate_video_veo3(
                prompt=visual_prompt,
                script=script_text,
                output_path=veo3_raw_path,
                aspect_ratio="9:16",
                model="veo3_fast"
            )

            # ── Ajout des sous-titres sur la vidéo Veo3 ─────────────────────
            job.progress = 85
            job.message = "Ajout des sous-titres..."

            await add_subtitles_to_video(
                video_path=veo3_raw_path,
                captions=request.captions,
                output_path=output_path,
                duration=duration
            )

        else:
            # ── Format standard — images + voix ElevenLabs ───────────────────
            audio_path = f"{STORAGE_PATH}/audio/{video_id}.mp3"

            job.status = "processing"
            job.progress = 10
            job.message = "Génération de la voix off..."
            await generate_voiceover(request.script, audio_path)

            job.progress = 30
            nb_images = IMAGES_BY_DURATION.get(request.duration, 3)
            job.message = f"Génération de {nb_images} visuels IA..."

            visual_prompt = (
                f"Cinematic vertical 9:16, {request.hook}, "
                "African wellness aesthetic, natural herbs honey ginger, "
                "warm golden tones, dramatic lighting, no text, no watermark"
            )

            image_paths = await generate_multiple_images(
                base_prompt=visual_prompt,
                output_dir=f"{STORAGE_PATH}/images",
                video_id=video_id,
                count=nb_images,
            )

            job.progress = 70
            job.message = "Assemblage vidéo + transitions + sous-titres..."
            await assemble_video(audio_path, image_paths, request.captions, output_path, duration)

        # ── Done ──────────────────────────────────────────────────────────────
        job.status = "done"
        job.progress = 100
        job.message = "Vidéo prête !"
        job.video_url = f"/videos/{video_id}.mp4"
        print(f"[pipeline] Vidéo générée : {output_path}")

    except Exception as e:
        job.status = "error"
        job.message = str(e)
        job.progress = 0
        print(f"[pipeline] Erreur : {e}")