import asyncio
import json
import os
import random

REMOTION_DIR = "/app/remotion"
OUTPUT_DIR = "/app/storage/videos"
MUSIC_DIR = "/app/storage/music"


def _pick_music() -> str | None:
    """Retourne un chemin statique Remotion vers un MP3 aléatoire, ou None."""
    if not os.path.isdir(MUSIC_DIR):
        return None
    tracks = [
        f for f in os.listdir(MUSIC_DIR)
        if f.lower().endswith((".mp3", ".m4a", ".aac", ".wav"))
    ]
    if not tracks:
        return None
    return f"storage/music/{random.choice(tracks)}"


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

    music_static = _pick_music()
    if music_static:
        print(f"[remotion] Musique de fond : {music_static}")
    else:
        print("[remotion] Aucune musique trouvée — voix seule")

    props_data = {
        "audioSrc": _to_static_path(audio_path),
        "captions": captions,
        "imagePaths": [_to_static_path(p) for p in image_paths],
        "durationSeconds": duration_seconds,
    }
    if music_static:
        props_data["musicSrc"] = music_static

    props = json.dumps(props_data)

    cmd = [
        "npx",
        "remotion",
        "render",
        "src/index.ts",
        "FacebookVideo",
        output_path,
        "--props",
        props,
        "--browser-executable",
        "/usr/bin/chromium",
        "--chromium-flags=--no-sandbox --disable-setuid-sandbox",
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
