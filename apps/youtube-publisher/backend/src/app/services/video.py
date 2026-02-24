import os
import asyncio
import httpx
import random

VIDEO_DIR = "/app/outputs/videos"
TEMP_DIR = "/app/outputs/temp"

def get_kenburns_filter(duration: int) -> str:
    """Génère un filtre Ken Burns aléatoire pour chaque scène"""
    effects = [
        # Zoom in center
        f"scale=8000:-1,zoompan=z='min(zoom+0.0015,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={duration*25}:s=1920x1080:fps=25",
        # Zoom out center
        f"scale=8000:-1,zoompan=z='if(lte(zoom,1.0),1.3,max(1.0,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={duration*25}:s=1920x1080:fps=25",
        # Pan left to right + zoom in
        f"scale=8000:-1,zoompan=z='min(zoom+0.001,1.2)':x='if(lte(zoom,1.0),0,x+1)':y='ih/2-(ih/zoom/2)':d={duration*25}:s=1920x1080:fps=25",
        # Pan right to left + zoom in
        f"scale=8000:-1,zoompan=z='min(zoom+0.001,1.2)':x='if(gte(x,iw-iw/zoom),iw-iw/zoom,x+2)':y='ih/2-(ih/zoom/2)':d={duration*25}:s=1920x1080:fps=25",
        # Pan bottom to top
        f"scale=8000:-1,zoompan=z='min(zoom+0.001,1.2)':x='iw/2-(iw/zoom/2)':y='if(lte(zoom,1.0),0,y+1)':d={duration*25}:s=1920x1080:fps=25",
    ]
    return random.choice(effects)

async def assemble_video(video_id: int, scenes: list, image_urls: list, audio_files: list) -> str:
    os.makedirs(VIDEO_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)

    # Télécharger les images
    image_files = []
    async with httpx.AsyncClient() as client:
        for i, url in enumerate(image_urls):
            img_path = f"{TEMP_DIR}/video_{video_id}_scene_{i+1}.jpg"
            response = await client.get(url, timeout=30)
            with open(img_path, "wb") as f:
                f.write(response.content)
            image_files.append(img_path)

    output_path = f"{VIDEO_DIR}/video_{video_id}.mp4"

    # Créer une vidéo par scène avec effet Ken Burns
    scene_videos = []
    for i, (img, audio) in enumerate(zip(image_files, audio_files)):
        scene_video = f"{TEMP_DIR}/video_{video_id}_scene_{i+1}.mp4"
        duration = scenes[i].get("duration_seconds", 20)
        kenburns = get_kenburns_filter(duration)

        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", img,
            "-i", audio,
            "-vf", kenburns,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-shortest",
            "-pix_fmt", "yuv420p",
            "-r", "25",
            scene_video
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise Exception(f"FFmpeg scene {i+1} error: {stderr.decode()}")

        scene_videos.append(scene_video)

    # Créer le fichier de concat
    concat_file = f"{TEMP_DIR}/video_{video_id}_concat.txt"
    with open(concat_file, "w") as f:
        for scene_video in scene_videos:
            f.write(f"file '{scene_video}'\n")

    # Assembler toutes les scènes avec fondu enchaîné
    cmd_concat = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output_path
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd_concat,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        raise Exception(f"FFmpeg concat error: {stderr.decode()}")

    return output_path
