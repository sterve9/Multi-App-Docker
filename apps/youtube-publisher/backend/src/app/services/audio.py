import httpx
import os
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

async def generate_audio(video_id: int, scenes: list) -> list:
    audio_dir = f"/app/outputs/audio/video_{video_id}"
    os.makedirs(audio_dir, exist_ok=True)
    audio_files = []
    
    async with httpx.AsyncClient() as client:
        for scene in scenes:
            scene_num = scene["scene_number"]
            output_path = f"{audio_dir}/scene_{scene_num}.mp3"
            
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY, "Content-Type": "application/json"},
                json={
                    "text": scene["narration"],
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}
                },
                timeout=30
            )
            
            # ✅ Vérifier si ElevenLabs a retourné une erreur JSON
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type or response.status_code != 200:
                try:
                    error_data = response.json()
                    error_detail = error_data.get("detail", error_data)
                    status = error_detail.get("status", "") if isinstance(error_detail, dict) else ""
                    message = error_detail.get("message", str(error_detail)) if isinstance(error_detail, dict) else str(error_detail)
                    
                    if status == "quota_exceeded":
                        raise Exception(
                            f"ElevenLabs quota épuisé : {message}. "
                            f"Rechargez vos crédits sur https://elevenlabs.io"
                        )
                    else:
                        raise Exception(f"ElevenLabs erreur [{response.status_code}] : {message}")
                except (json.JSONDecodeError, AttributeError):
                    raise Exception(f"ElevenLabs réponse invalide [{response.status_code}]")
            
            # ✅ Vérifier que le contenu est bien un MP3 (magic bytes: FF FB ou ID3)
            content = response.content
            if len(content) < 100:
                raise Exception(
                    f"ElevenLabs a retourné un fichier audio trop petit ({len(content)} bytes) "
                    f"pour la scène {scene_num}. Contenu: {content[:200]}"
                )
            
            # Vérifier les magic bytes MP3
            is_mp3 = (
                content[:2] in (b'\xff\xfb', b'\xff\xf3', b'\xff\xf2') or  # MP3 frame
                content[:3] == b'ID3'  # ID3 tag
            )
            if not is_mp3:
                # Essayer de décoder comme JSON pour donner un meilleur message d'erreur
                try:
                    error_data = json.loads(content)
                    raise Exception(f"ElevenLabs erreur (fichier non audio) : {error_data}")
                except json.JSONDecodeError:
                    raise Exception(
                        f"ElevenLabs a retourné un fichier non-MP3 pour la scène {scene_num} "
                        f"(premiers bytes: {content[:20].hex()})"
                    )
            
            with open(output_path, "wb") as f:
                f.write(content)
            
            logger.info(f"Audio scène {scene_num} généré : {len(content)} bytes → {output_path}")
            audio_files.append(output_path)
    
    return audio_files