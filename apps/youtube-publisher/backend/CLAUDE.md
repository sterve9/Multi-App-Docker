# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

The app runs inside Docker. There is no local dev server — all execution happens in the container.

```bash
# Build and start
docker build -t youtube-publisher-backend .
docker run --env-file .env -p 8000:8000 youtube-publisher-backend

# Or via docker-compose from the parent Multi-App-Docker directory
docker-compose up youtube-publisher-backend
```

The API is served by uvicorn on port 8000. The app auto-creates DB tables on startup via SQLAlchemy `create_all`.

## Required Environment Variables

See `.env.example`. The following are mandatory (app fails to start without them):
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — used by `services/script.py`
- `KIE_AI_API_KEY` — used by `services/image.py` for **both** formats (Kling 3.0 video + Flux-2 Pro image)
- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` — used by `services/audio.py`

Optional:
- `N8N_WEBHOOK_URL` — post-pipeline webhook
- `YOUTUBE_*` — YouTube upload credentials
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — completion notifications

Deprecated (can be removed from .env):
- `REPLICATE_API_TOKEN` — remplacé par kie.ai, plus utilisé

## Architecture

This is a **FastAPI + SQLAlchemy** backend for automated YouTube video generation. The core flow is a multi-step async pipeline triggered via API:

```
POST /api/generate/create
  → Video record created in PostgreSQL
  → BackgroundTask: run_pipeline(video_id)
      1. generate_script()    — Claude claude-opus-4-5 → 18-scene JSON
      2. generate_images()    — Kling 3.0 (premium) or Replicate Flux (économique)
      3. generate_audio()     — ElevenLabs TTS per scene
      4. assemble_video()     — FFmpeg: Ken Burns + subtitles (ASS) + background music
      5. notify / n8n webhook
```

### Two video formats

- **`premium`**: Each scene generates a short AI video clip via Kie.ai Kling 3.0, using character reference images from `/app/assets/characters/`. Videos are downloaded and assembled.
- **`économique`**: Each scene generates a static image via Replicate Flux 1.1 Pro Ultra, then animated with FFmpeg Ken Burns zoom effects.

### Pipeline resume

If a pipeline fails mid-way, `POST /api/generate/{video_id}/resume` auto-detects the furthest completed step (script → images → audio → assembly) and resumes from there.

### Series continuity

Videos support a `serie_id` + `episode_number` system. The `previous_summary` field (stored on the `Video` model) carries episode context forward. On creation, if `previous_summary` is not provided, it's auto-fetched from the previous episode in the same series.

### Key files

| File | Purpose |
|------|---------|
| `src/app/services/pipeline.py` | Orchestrates the full pipeline + resume logic |
| `src/app/services/script.py` | Claude API call → structured 18-scene JSON |
| `src/app/services/image.py` | Kling 3.0 (premium) and Replicate Flux (économique) |
| `src/app/services/audio.py` | ElevenLabs TTS per scene |
| `src/app/services/video.py` | FFmpeg assembly: Ken Burns, ASS subtitles, music mix, thumbnail |
| `src/app/models/video.py` | `Video` SQLAlchemy model + `VideoStatus` / `VideoFormat` enums |
| `src/app/core/config.py` | Pydantic settings loaded from `.env` |

### Output directories (inside container)

- `/app/outputs/audio/video_{id}/` — per-scene MP3 files
- `/app/outputs/videos/` — final MP4
- `/app/outputs/temp/` — intermediate FFmpeg files
- `/app/outputs/thumbnails/` — generated thumbnails
- `/app/assets/music/` — background music (calm, epic, inspiring, mysterious)
- `/app/assets/characters/` — reference images for Kling character consistency

### Fixed characters

The series always features **Kofi** (35-year-old African man) and **Ama** (32-year-old African woman). Their visual descriptions are hardcoded in `services/script.py` and embedded in every `image_prompt`.

## API Endpoints

- `POST /api/generate/create` — create + launch pipeline (preferred)
- `POST /api/generate/{video_id}` — re-run pipeline from scratch
- `POST /api/generate/{video_id}/resume` — smart resume from last checkpoint
- `GET /api/videos` — list videos (optional `?status=` filter)
- `GET /api/videos/{id}` — get video details
- `GET /api/videos/{id}/download` — download final MP4
- `DELETE /api/videos/{id}` — delete video record
