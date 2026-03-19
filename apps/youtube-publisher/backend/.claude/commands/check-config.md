# Check project configuration and environment

Audit environment variables and surface missing or outdated config.

## Step 1 — Read current config

Read `src/app/core/config.py` to see all declared settings.

## Step 2 — Present the full checklist

### Required — app won't start without these
- [ ] `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`)
- [ ] `ANTHROPIC_API_KEY` — Claude API key → https://console.anthropic.com
- [ ] `ELEVENLABS_API_KEY` — ElevenLabs key → https://elevenlabs.io
- [ ] `ELEVENLABS_VOICE_ID` — default: `21m00Tcm4TlvDq8ikWAM` (Rachel)
- [ ] `KIE_AI_API_KEY` — required for **both** formats (premium video + économique image) → https://kie.ai/api-key

### Optional — integrations
- [ ] `N8N_WEBHOOK_URL` — post-pipeline webhook to trigger YouTube upload automation
- [ ] `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — completion/failure notifications
- [ ] `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` + `YOUTUBE_REFRESH_TOKEN` — direct YouTube upload

### Deprecated — no longer needed
- [ ] `REPLICATE_API_TOKEN` — was used for économique format (Replicate Flux), now replaced by kie.ai. Can be removed.

## Step 3 — Check for common mistakes

1. **`KIE_AI_API_KEY` missing** → both formats will fail at image/video generation
2. **`REPLICATE_API_TOKEN` still set but économique format using kie.ai** → harmless but misleading, remove it
3. **`ELEVENLABS_VOICE_ID` wrong** → audio will fail with 404 from ElevenLabs API
4. **`DATABASE_URL` using `localhost`** → won't work inside Docker, use the container service name (e.g. `db` or `postgres`)
5. **`ANTHROPIC_API_KEY` expired** → script generation will throw `AuthenticationError`

## Step 4 — Check kie.ai credits

If the user suspects credit issues:
```bash
curl -X GET https://api.kie.ai/api/v1/chat/credit \
  -H "Authorization: Bearer <KIE_AI_API_KEY>"
```

## Step 5 — Check ElevenLabs quota

ElevenLabs quota errors are non-retryable and will immediately fail the pipeline at the audio step. Check usage at https://elevenlabs.io/app/subscription.

## Step 6 — Verify Docker environment

Check that all vars are passed to the container:
```bash
# Via .env file
docker run --env-file .env -p 8000:8000 youtube-publisher-backend

# Or via docker-compose (vars in .env at repo root or service definition)
docker-compose up youtube-publisher-backend
```

Check active env in running container:
```bash
docker exec youtube-publisher-backend env | grep -E "ANTHROPIC|ELEVENLABS|KIE|DATABASE|N8N|TELEGRAM"
```
