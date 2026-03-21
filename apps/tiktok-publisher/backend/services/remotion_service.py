import asyncio
import os
import json

REMOTION_DIR = "/app/remotion"
OUTPUT_DIR = "/app/storage/videos"


async def render_video(
    video_id: str, script: str, audio_path: str, duration_seconds: int
) -> str:
    """
    Lance le rendu Remotion via CLI avec le script et l'audio ElevenLabs.
    Retourne le chemin du fichier MP4 généré.
    """
    output_path = os.path.join(OUTPUT_DIR, f"{video_id}.mp4")

    props = json.dumps(
        {
            "script": script,
            "audioSrc": audio_path,
            "durationSeconds": duration_seconds,
        }
    )

    cmd = [
        "npx",
        "remotion",
        "render",
        "TikTokVideo",
        output_path,
        "--props",
        props,
        "--log",
        "error",
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=REMOTION_DIR,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"Remotion render failed: {stderr.decode()}")

    return output_path
