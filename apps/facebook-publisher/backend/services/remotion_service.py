import asyncio
import json
import os

REMOTION_DIR = "/app/remotion"
OUTPUT_DIR = "/app/storage/videos"


def _to_static_path(absolute_path: str) -> str:
    """
    Remotion staticFile() sert les fichiers depuis le dossier public/ du projet Remotion.
    On monte /app/storage → remotion/public/storage, donc on retourne le chemin relatif.
    ex: /app/storage/audio/abc.mp3 → storage/audio/abc.mp3
    """
    return absolute_path.replace("/app/", "")


async def render_video(
    video_id: str,
    audio_path: str,
    captions: list[str],
    image_paths: list[str],
    duration_seconds: int,
) -> str:
    """
    Lance le rendu Remotion (composition FacebookVideo) et retourne
    le chemin local du fichier MP4 généré.
    """
    output_path = os.path.join(OUTPUT_DIR, f"{video_id}.mp4")

    props = json.dumps(
        {
            "audioSrc": _to_static_path(audio_path),
            "captions": captions,
            "imagePaths": [_to_static_path(p) for p in image_paths],
            "durationSeconds": duration_seconds,
        }
    )

    cmd = [
        "npx",
        "remotion",
        "render",
        "src/index.ts",
        "FacebookVideo",
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
        raise RuntimeError(f"Remotion render failed:\n{stderr.decode()}")

    return output_path
