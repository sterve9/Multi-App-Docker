# Migrate économique format to kie.ai image generation

Replace Replicate Flux with a kie.ai image model in `generate_single_image_economique()`.

## Context

Current state:
- `premium` format → Kling 3.0 via kie.ai (vidéos courtes) ✅
- `économique` format → Replicate Flux 1.1 Pro Ultra (images statiques) ❌ à remplacer

Target state:
- Both formats use kie.ai exclusively
- `REPLICATE_API_TOKEN` removed
- `KIE_AI_API_KEY` required for both

---

## Step 1 — Choose the image model

Ask the user which kie.ai image model to use. Recommend based on use case:

| Model | Best for | Notes |
|---|---|---|
| `flux-2/pro-text-to-image` | Closest drop-in for old Replicate Flux | aspect_ratio 16:9, resolution 1K/2K |
| `bytedance/seedream-v4-text-to-image` | Photorealistic, cinematic scenes | landscape_16_9, up to 4K |
| `seedream/4.5-text-to-image` | Good quality + fast | aspect_ratio 16:9, quality basic/high |
| `google/imagen4` | Photorealism + prompt adherence | aspect_ratio 16:9 |

**Default recommendation**: `flux-2/pro-text-to-image` (most similar to old Replicate Flux behavior)

---

## Step 2 — Read the current file

Read `src/app/services/image.py` entirely before making any changes.

---

## Step 3 — Replace `generate_single_image_economique()`

Replace the function with a kie.ai version. Use the correct documented endpoints:

```python
async def generate_single_image_economique(prompt: str, scene_num: int) -> str:
    """Génère une image via kie.ai (format économique). Retourne l'URL de l'image."""
    headers = {
        "Authorization": f"Bearer {settings.KIE_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    # Choose model based on user preference — default: flux-2/pro-text-to-image
    payload = {
        "model": "flux-2/pro-text-to-image",
        "input": {
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "resolution": "1K"
        }
    }

    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            if attempt > 0:
                delay = RETRY_DELAYS[attempt - 1]
                logger.info(f"Scène {scene_num} — retry {attempt}/{MAX_RETRIES-1} dans {delay}s...")
                await asyncio.sleep(delay)

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.kie.ai/api/v1/jobs/createTask",
                    headers=headers,
                    json=payload
                )
                data = response.json()
                if data.get("code") != 200:
                    raise Exception(f"kie.ai erreur scène {scene_num}: {data.get('msg')}")

                task_id = data["data"]["taskId"]
                logger.info(f"Scène {scene_num} — task image lancée : {task_id}")

                # Polling
                for _ in range(120):
                    await asyncio.sleep(5)
                    status_resp = await client.get(
                        "https://api.kie.ai/api/v1/jobs/recordInfo",
                        headers=headers,
                        params={"taskId": task_id}
                    )
                    record = status_resp.json().get("data", {})
                    state = record.get("state")

                    if state == "success":
                        import json as _json
                        url = _json.loads(record["resultJson"])["resultUrls"][0]
                        logger.info(f"Scène {scene_num} — image générée ✅ (tentative {attempt + 1})")
                        return url
                    elif state == "fail":
                        raise Exception(f"kie.ai génération échouée scène {scene_num}: {record.get('failMsg')}")

                raise Exception(f"kie.ai timeout scène {scene_num}")

        except Exception as e:
            last_exception = e
            logger.warning(f"Scène {scene_num} — tentative {attempt + 1}/{MAX_RETRIES} échouée : {e}")

    raise Exception(f"Scène {scene_num} échouée après {MAX_RETRIES} tentatives : {last_exception}")
```

---

## Step 4 — Also fix the premium format polling (critical bug)

While in the file, check `generate_single_image_premium()`. The current code uses:
- ❌ `GET /api/v1/jobs/detail` → should be `GET /api/v1/jobs/recordInfo`
- ❌ `record["output"]["works"][0]["resource"]["resource"]` → should be `json.loads(record["resultJson"])["resultUrls"][0]`
- ❌ `status == "SUCCESS"` → should be `state == "success"`
- ❌ File upload to `POST /api/v1/file/upload` → should be `POST /api/file-stream-upload`

Fix these as part of the same change. Ask the user first if they want to fix these too (they may have confirmed the legacy endpoints still work).

---

## Step 5 — Update config.py

In `src/app/core/config.py`:
- Change `REPLICATE_API_TOKEN: str` → `REPLICATE_API_TOKEN: str = ""`
- Verify `KIE_AI_API_KEY` has no default (required)

---

## Step 6 — Update CLAUDE.md

- Remove `REPLICATE_API_TOKEN` from required vars
- Move `KIE_AI_API_KEY` to required section (needed for both formats now)

---

## Step 7 — Verify

Confirm `generate_images()` dispatcher still works:
```python
if format == "premium":
    # kling 3.0 video — unchanged
else:
    # économique — now kie.ai image
```
No change needed there — it already calls `generate_single_image_economique()`.
