import httpx
import os
from core.config import settings

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"
AUDIO_DIR = "/app/storage/audio"


async def generate_voice(video_id: str, script: str) -> str:
    """
    Génère l'audio via ElevenLabs avec le voice clone de l'utilisateur.
    Retourne le chemin local du fichier MP3.
    """
    output_path = os.path.join(AUDIO_DIR, f"{video_id}.mp3")

    payload = {
        "text": script,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.85,
            "style": 0.30,
            "use_speaker_boost": True,
        },
    }

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{ELEVENLABS_API_URL}/text-to-speech/{settings.ELEVENLABS_VOICE_ID}",
            headers={
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()

        with open(output_path, "wb") as f:
            f.write(response.content)

    return output_path
