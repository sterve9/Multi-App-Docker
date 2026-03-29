from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.video import ScriptRequest, ScriptResponse, VideoGenerationRequest, VideoStatus
from services.claude_service import generate_script
from services.elevenlabs_service import generate_voiceover
from services.kieai_service import generate_multiple_images, generate_video_veo3
from services.ffmpeg_service import assemble_video, merge_clips_with_subtitles
import uuid, os

router = APIRouter()

jobs: dict[str, VideoStatus] = {}
STORAGE_PATH = "/app/storage"

IMAGES_BY_DURATION = {
    "15": 2,
    "30": 3,
    "60": 5,
}

# Veo3 génère ~8s par clip — nombre de clips selon durée souhaitée
CLIPS_BY_DURATION = {
    "15": 2,   # 2 clips ~8s = ~16s
    "30": 4,   # 4 clips ~8s = ~32s
    "60": 8,   # 8 clips ~8s = ~64s
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
            # ── VEO3 — génération multi-clips pour atteindre la durée voulue ─
            job.status = "processing"
            nb_clips = CLIPS_BY_DURATION.get(request.duration, 2)

            # Diviser le script en segments pour chaque clip
            script_words = request.script.split()
            words_per_clip = max(1, len(script_words) // nb_clips)
            script_segments = []
            for i in range(nb_clips):
                start = i * words_per_clip
                end = start + words_per_clip if i < nb_clips - 1 else len(script_words)
                segment = " ".join(script_words[start:end])
                script_segments.append(segment)

            print(f"[pipeline] Veo3 — {nb_clips} clips × ~8s = ~{nb_clips * 8}s")

            clip_paths = []
            for i in range(nb_clips):
                job.progress = 10 + int((i / nb_clips) * 65)
                job.message = f"Génération clip {i+1}/{nb_clips} (Veo3)..."

                clip_path = os.path.join(temp_dir, f"{video_id}_clip_{i}.mp4")

                await generate_video_veo3(
                    prompt="",  # Le prompt est construit dans generate_video_veo3
                    script=script_segments[i],
                    output_path=clip_path,
                    aspect_ratio="9:16",
                    model="veo3_fast"
                )
                clip_paths.append(clip_path)
                print(f"[pipeline] Clip {i+1}/{nb_clips} prêt")

            # ── Assembler les clips + sous-titres ────────────────────────────
            job.progress = 80
            job.message = "Assemblage des clips + sous-titres..."

            await merge_clips_with_subtitles(
                clip_paths=clip_paths,
                captions=request.captions,
                output_path=output_path,
                target_duration=duration
            )

        else:
            # ── Format standard — images Ken Burns + voix ElevenLabs ─────────
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
        print(f"[pipeline] Terminé: {output_path}")

    except Exception as e:
        job.status = "error"
        job.message = str(e)
        job.progress = 0
        print(f"[pipeline] Erreur: {e}")