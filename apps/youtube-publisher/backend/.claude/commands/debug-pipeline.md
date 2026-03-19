# Debug a failed pipeline

Diagnose and fix a failed video pipeline.

## Step 1 — Get the error

Ask the user for the `video_id` if not provided, then get the error:

```bash
# From API
curl https://api.youtube.sterveshop.cloud/api/videos/<video_id>

# From Docker logs
docker logs youtube-publisher-backend --tail=100 2>&1 | grep -i "erreur\|error\|échoué\|failed"
```

## Step 2 — Read the relevant files

Based on which step failed (visible in the `status` field):

| Status when failed | File to read |
|---|---|
| `scripting` | `src/app/services/script.py` |
| `generating_images` | `src/app/services/image.py` |
| `generating_audio` | `src/app/services/audio.py` |
| `assembling` | `src/app/services/video.py` |

Always also read `src/app/services/pipeline.py` for context.

## Step 3 — Diagnose

Match the error against known failure patterns:

### kie.ai errors
- `code != 200` on createTask → wrong API key or malformed payload → check `KIE_AI_API_KEY`, check payload schema in `/kie-api-reference`
- `state == "fail"` with `failMsg` → generation failed on kie.ai side → retry usually fixes it
- `kie.ai timeout` → task took > 10 min → kie.ai overloaded, retry
- `401` → invalid or expired `KIE_AI_API_KEY`
- `402` → insufficient credits → recharge at https://kie.ai

**⚠️ Known bug in current `image.py`**: Legacy polling endpoint `/api/v1/jobs/detail` may not work correctly. Documented endpoint is `/api/v1/jobs/recordInfo`. Response parsing also differs. Run `/kie-image` to fix.

### ElevenLabs errors
- `quota_exceeded` → credits exhausted, no retry, must recharge at https://elevenlabs.io
- `ElevenLabs erreur [401]` → invalid `ELEVENLABS_API_KEY`
- `fichier audio trop petit` → API returned error body instead of MP3

### Claude / Script errors
- `json.JSONDecodeError` → Claude returned malformed JSON → retry (happens ~5% of the time)
- `anthropic.AuthenticationError` → invalid `ANTHROPIC_API_KEY`
- `max_tokens exceeded` → script too long (shouldn't happen with 8000 limit)

### FFmpeg errors
- `No such file or directory` for image → kie.ai URL expired (14-day retention) → re-run images step
- `Invalid data found when processing input` → corrupted audio MP3 → re-run audio step
- `subtitles` filter error → non-blocking (code continues without subtitles)
- `yuv420p` / codec error → usually transient, retry assembly

### Database errors
- `psycopg2.OperationalError` → PostgreSQL unreachable → check `DATABASE_URL`

## Step 4 — Fix and resume

Determine which assets are already saved:

```
has_script = video.script is not None
has_images = video.scenes_images is not None and len > 0
has_audio  = video.scenes_audio is not None and len > 0
```

Choose the right resume point:

```bash
# Resume from assembly (script + images + audio OK)
curl -X POST https://api.youtube.sterveshop.cloud/api/generate/<id>/resume

# Resume from audio (script + images OK)
curl -X POST https://api.youtube.sterveshop.cloud/api/generate/<id>/resume

# Full restart (script missing)
curl -X POST https://api.youtube.sterveshop.cloud/api/generate/<id>
```

The `/resume` endpoint auto-detects the furthest completed step — no need to specify.

## Step 5 — If the bug is in image.py polling

Run `/kie-image` to fix the legacy endpoint discrepancy. This fixes:
- Wrong polling URL (`/jobs/detail` → `/jobs/recordInfo`)
- Wrong response parsing (`output.works[0]` → `json.loads(resultJson)["resultUrls"][0]`)
- Wrong status check (`"SUCCESS"` → `"success"`)
