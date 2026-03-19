# Create a new video episode

Guide the user through creating a new episode and monitoring it.

## Step 1 — Gather parameters

Ask the user for:

| Parameter | Required | Default | Notes |
|---|---|---|---|
| `topic` | ✅ | — | Subject/title of the episode |
| `episode_number` | ✅ | — | Integer, starts at 1 |
| `serie_id` | ✅ | `couple_virilite` | Series identifier |
| `format` | — | `premium` | `premium` (Kling 3.0 video) or `economique` (kie.ai image) |
| `style` | — | `storytelling` | `storytelling`, `cinematique`, `educatif`, `documentaire`, `motivation` |
| `previous_summary` | — | auto-fetched | Leave empty — auto-fetched from previous episode in DB |

## Step 2 — Show the curl command

```bash
curl -X POST https://api.youtube.sterveshop.cloud/api/generate/create \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "<topic>",
    "serie_id": "<serie_id>",
    "episode_number": <episode_number>,
    "format": "<format>",
    "style": "<style>"
  }'
```

Expected response:
```json
{
  "message": "Pipeline lancé",
  "video_id": 42,
  "format": "premium",
  "episode_number": 3,
  "serie_id": "couple_virilite",
  "has_previous_context": true
}
```

## Step 3 — Explain the timeline

**Format `premium`** (Kling 3.0 AI video per scene):
- ~20–40 minutes total (18 scenes × ~1–2 min each for Kling generation)
- Higher quality, cinematic AI video clips
- Requires `KIE_AI_API_KEY` with credits

**Format `économique`** (kie.ai image, animated with Ken Burns):
- ~10–15 minutes total
- Static images animated with zoom/pan effects
- Lower credit cost

## Step 4 — Monitor status

```bash
# Poll every 30s
curl https://api.youtube.sterveshop.cloud/api/videos/<video_id>
```

Status progression:
```
DRAFT → SCRIPTING → GENERATING_IMAGES → GENERATING_AUDIO → ASSEMBLING → READY
```

## Step 5 — If it fails

```bash
# Smart resume from last checkpoint (recommended)
curl -X POST https://api.youtube.sterveshop.cloud/api/generate/<video_id>/resume

# Full restart from scratch
curl -X POST https://api.youtube.sterveshop.cloud/api/generate/<video_id>
```

Resume auto-detects: if script+images+audio exist → resumes at assembly. If only script+images → resumes at audio. Otherwise → full restart.

Run `/debug-pipeline` for detailed failure diagnosis.

## Step 6 — Download the final video

```bash
curl -O https://api.youtube.sterveshop.cloud/api/videos/<video_id>/download
```

Or trigger n8n webhook (auto-triggered at end of pipeline if `N8N_WEBHOOK_URL` is set).
