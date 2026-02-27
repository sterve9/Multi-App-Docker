import httpx
import os
import json
import asyncio
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [5, 15, 30]  # backoff exponentiel en secondes


async def generate_single_audio(client: httpx.AsyncClient, scene: dict, output_path: str) -> str:
    scene_num = scene["scene_number"]
    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            if attempt > 0:
                delay = RETRY_DELAYS[attempt - 1]
                logger.info(f"Audio scène {scene_num} — retry {attempt}/{MAX_RETRIES - 1} dans {delay}s...")
                await asyncio.sleep(delay)

            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}",
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "text": scene["narration"],
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}
                },
                timeout=30
            )

            # Vérifier si ElevenLabs a retourné une erreur JSON
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type or response.status_code != 200:
                try:
                    error_data = response.json()
                    error_detail = error_data.get("detail", error_data)
                    status = error_detail.get("status", "") if isinstance(error_detail, dict) else ""
                    message = error_detail.get("message", str(error_detail)) if isinstance(error_detail, dict) else str(error_detail)

                    # Quota épuisé — inutile de retry
                    if status == "quota_exceeded":
                        raise Exception(
                            f"ElevenLabs quota épuisé : {message}. "
                            f"Rechargez vos crédits sur https://elevenlabs.io"
                        )
                    # Autre erreur API — on peut retry
                    raise ValueError(f"ElevenLabs erreur [{response.status_code}] : {message}")
                except (json.JSONDecodeError, AttributeError):
                    raise ValueError(f"ElevenLabs réponse invalide [{response.status_code}]")

            # Vérifier que le contenu est bien un MP3
            content = response.content
            if len(content) < 100:
                raise ValueError(
                    f"ElevenLabs fichier audio trop petit ({len(content)} bytes) "
                    f"pour la scène {scene_num}"
                )

            is_mp3 = (
                content[:2] in (b'\xff\xfb', b'\xff\xf3', b'\xff\xf2') or
                content[:3] == b'ID3'
            )
            if not is_mp3:
                try:
                    error_data = json.loads(content)
                    raise ValueError(f"ElevenLabs erreur (fichier non audio) : {error_data}")
                except json.JSONDecodeError:
                    raise ValueError(
                        f"ElevenLabs fichier non-MP3 scène {scene_num} "
                        f"(premiers bytes: {content[:20].hex()})"
                    )

            with open(output_path, "wb") as f:
                f.write(content)

            logger.info(f"Audio scène {scene_num} généré ✅ : {len(content)} bytes (tentative {attempt + 1})")
            return output_path

        except Exception as e:
            last_exception = e
            error_str = str(e)

            # Ne pas retry sur quota épuisé
            if "quota_épuisé" in error_str or "quota_exceeded" in error_str:
                logger.error(f"Audio scène {scene_num} — quota épuisé, abandon immédiat")
                raise

            logger.warning(f"Audio scène {scene_num} — tentative {attempt + 1}/{MAX_RETRIES} échouée : {error_str}")

    logger.error(f"Audio scène {scene_num} — échec après {MAX_RETRIES} tentatives")
    raise Exception(f"Audio scène {scene_num} échouée après {MAX_RETRIES} tentatives : {last_exception}")


async def generate_audio(video_id: int, scenes: list) -> list:
    audio_dir = f"/app/outputs/audio/video_{video_id}"
    os.makedirs(audio_dir, exist_ok=True)
    audio_files = []

    async with httpx.AsyncClient() as client:
        for scene in scenes:
            scene_num = scene["scene_number"]
            output_path = f"{audio_dir}/scene_{scene_num}.mp3"
            result = await generate_single_audio(client, scene, output_path)
            audio_files.append(result)

    return audio_files