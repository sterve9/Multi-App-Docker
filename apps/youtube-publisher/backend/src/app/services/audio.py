import httpx
import os
from app.core.config import settings

AUDIO_DIR = "/app/outputs/audio"

async def generate_audio(scenes: list) -> list:
    os.makedirs(AUDIO_DIR, exist_ok=True)
    audio_files = []
    
    async with httpx.AsyncClient() as client:
        for scene in scenes:
            scene_num = scene["scene_number"]
            output_path = f"{AUDIO_DIR}/scene_{scene_num}.mp3"
            
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
            
            with open(output_path, "wb") as f:
                f.write(response.content)
            
            audio_files.append(output_path)
    
    return audio_files
