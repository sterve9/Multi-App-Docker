# Add or configure a new video series

Set up a new series — different characters, theme, or serie_id.

## How series work

- `serie_id` is a string identifier (e.g. `couple_virilite`, `business_mindset`)
- Episodes are linked via `serie_id` + `episode_number`
- Each episode auto-fetches the previous episode's `episode_summary` for narrative continuity
- **Characters Kofi and Ama are hardcoded** in `script.py` — changing them requires code edits

## Step 1 — Ask what the user wants to change

Options:
- A) New `serie_id` only (same characters, new topic/theme)
- B) New characters (different names and physical descriptions)
- C) New series theme embedded in the Claude prompt
- D) New character reference images for kie.ai

## Option A — New serie_id only

No code change needed. Just use a different `serie_id` in the API call:
```bash
curl -X POST .../api/generate/create -d '{
  "topic": "...",
  "serie_id": "my_new_series",
  "episode_number": 1,
  "format": "premium"
}'
```

## Option B — Change characters

Read `src/app/services/script.py` then modify:

```python
# Lines ~8-17 — names and physical descriptions
CHARACTERS = {
    "homme": {
        "nom": "NewName",
        "description": "physical description..."
    },
    "femme": {
        "nom": "NewName",
        "description": "physical description..."
    }
}

# Line ~20-25 — visual consistency base for image prompts
CHARACTER_VISUAL_BASE = (
    f"NewName ({CHARACTERS['homme']['description']}) and "
    f"NewName ({CHARACTERS['femme']['description']}), "
    "photorealistic, cinematic lighting, [setting], "
    "dramatic shadows, emotional atmosphere, 16:9 aspect ratio"
)
```

Also update all hardcoded references to "Kofi" and "Ama" in the prompt template (lines ~45-85).

## Option C — Change the series theme

Read `src/app/services/script.py`. The theme is embedded in the system prompt around line 50:

```python
THÈME DE LA SÉRIE : Les secrets cachés dans un couple — comment le manque de virilité...
```

Replace this with the new series theme. Also update:
- The episode title format (line ~73)
- The description footer (line ~68) — the product link

## Option D — Change character reference images (kie.ai premium format)

Images go in `/app/assets/characters/` inside the container.

Requirements:
- Formats: `.jpg`, `.jpeg`, `.png`
- Max 4 images (kie.ai `kling_elements` limit)
- Max 10MB each
- Should clearly show the characters' faces and style

To add images, either:
1. Add them to the Docker image via Dockerfile `COPY` instruction
2. Mount via docker-compose volume:
   ```yaml
   volumes:
     - ./assets/characters:/app/assets/characters
   ```

After updating images, rebuild and restart the container. The images are uploaded to kie.ai at the start of each `generate_images()` call (not cached — uploaded fresh each time, deleted from kie.ai after 3 days).

## Episode creation workflow

```bash
# Episode 1 (no prior context)
curl -X POST .../api/generate/create -d '{
  "topic": "Le premier doute",
  "serie_id": "my_series",
  "episode_number": 1,
  "format": "premium"
}'

# Episode 2+ (previous_summary auto-fetched from DB)
curl -X POST .../api/generate/create -d '{
  "topic": "La confrontation",
  "serie_id": "my_series",
  "episode_number": 2,
  "format": "premium"
}'
```

The `previous_summary` is auto-fetched from the last READY episode in the same series. No manual input needed.
