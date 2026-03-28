from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.video import ScriptRequest, ScriptResponse, VideoGenerationRequest, VideoStatus
from services.claude_service import generate_script
from services.elevenlabs_service import generate_voiceover
from services.kieai_service import generate_multiple_images, generate_video
from services.ffmpeg_service import assemble_video, assemble_video_clips
import uuid, os, asyncio

router = APIRouter()

# Stockage en mémoire des jobs (Redis en Phase 2)
jobs: dict[str, VideoStatus] = {}

STORAGE_PATH = "/app/storage"

# Nombre d'images générées selon la durée (format standard)
IMAGES_BY_DURATION = {
    "15": 2,   # 2 images × ~7.5s chacune
    "30": 3,   # 3 images × ~10s chacune
    "60": 5,   # 5 images × ~12s chacune
}

# Nombre de clips Kling selon la durée (format video_ia)
CLIPS_BY_DURATION = {
    "15": 2,   # 2 clips × ~7s chacun
    "30": 3,   # 3 clips × ~10s chacun
    "60": 6,   # 6 clips × ~10s chacun
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

        audio_path  = f"{STORAGE_PATH}/audio/{video_id}.mp3"
        output_path = f"{STORAGE_PATH}/videos/{video_id}.mp4"

        # Prompt visuel de base — adapté au Rituel Ancestral
        visual_prompt = (
            f"Cinematic vertical 9:16 video, {request.hook}, "
            "African man 45-50 years old, wise and calm expression, "
            "traditional setting, warm golden candlelight, "
            "natural herbs honey ginger cinnamon in foreground, "
            "authentic African wellness aesthetic, "
            "dramatic warm lighting, photorealistic, no text, no watermark"
        )

        # ── Étape 1 : Voix off ElevenLabs ───────────────────────────────────
        job.status = "processing"
        job.progress = 10
        job.message = "Génération de la voix off..."
        await generate_voiceover(request.script, audio_path)

        # ── Étape 2 : Visuels ────────────────────────────────────────────────
        job.progress = 30

        if request.format == "video_ia":
            # ── Kling 3.0 — vrais clips vidéo IA ────────────────────────────
            clip_duration = 10  # Kling max = 10s par clip
            nb_clips = CLIPS_BY_DURATION.get(request.duration, 3)

            job.message = f"Génération de {nb_clips} clips vidéo Kling 3.0..."
            print(f"[kling] Démarrage génération {nb_clips} clips × {clip_duration}s")

            clip_paths = []
            for i in range(nb_clips):
                clip_path = os.path.join(temp_dir, f"{video_id}_clip_{i}.mp4")
                job.progress = 30 + int((i / nb_clips) * 35)
                job.message = f"Clip {i+1}/{nb_clips} en cours (Kling 3.0)..."

                # Variation du prompt par clip pour éviter répétition
                clip_prompts = [
                    f"{visual_prompt}, close-up face intense gaze",
                    f"{visual_prompt}, hands preparing ritual ingredients",
                    f"{visual_prompt}, wide shot morning ritual atmosphere",
                    f"{visual_prompt}, medium shot speaking to camera",
                    f"{visual_prompt}, detail shot natural ingredients texture",
                    f"{visual_prompt}, golden hour backlight silhouette",
                ]
                prompt_for_clip = clip_prompts[i % len(clip_prompts)]

                await generate_video(
                    prompt=prompt_for_clip,
                    output_path=clip_path,
                    duration=clip_duration
                )
                clip_paths.append(clip_path)
                print(f"[kling] Clip {i+1}/{nb_clips} généré : {clip_path}")

            # ── Étape 3 : Assemblage clips + voix + sous-titres ──────────────
            job.progress = 70
            job.message = "Assemblage clips vidéo + voix + sous-titres..."
            await assemble_video_clips(
                audio_path=audio_path,
                clip_paths=clip_paths,
                captions=request.captions,
                output_path=output_path,
                duration=duration
            )

        else:
            # ── Format standard — images Ken Burns ───────────────────────────
            nb_images = IMAGES_BY_DURATION.get(request.duration, 3)
            job.message = f"Génération de {nb_images} visuels IA en parallèle..."
            image_paths = await generate_multiple_images(
                base_prompt=visual_prompt,
                output_dir=f"{STORAGE_PATH}/images",
                video_id=video_id,
                count=nb_images,
            )

            # ── Étape 3 : Assemblage FFmpeg ───────────────────────────────────
            job.progress = 70
            job.message = "Assemblage vidéo + transitions + sous-titres..."
            await assemble_video(
                audio_path,
                image_paths,
                request.captions,
                output_path,
                duration
            )

        # ── Done ─────────────────────────────────────────────────────────────
        job.status = "done"
        job.progress = 100
        job.message = "Vidéo prête !"
        job.video_url = f"/videos/{video_id}.mp4"
        print(f"[pipeline] Vidéo générée avec succès : {output_path}")

    except Exception as e:
        job.status = "error"
        job.message = str(e)
        job.progress = 0
        print(f"[pipeline] Erreur : {e}")