import os
import asyncio
import httpx

VIDEO_DIR = "/app/outputs/videos"
TEMP_DIR = "/app/outputs/temp"

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

    # Créer une vidéo par scène puis les concaténer
    scene_videos = []
    for i, (img, audio) in enumerate(zip(image_files, audio_files)):
        scene_video = f"{TEMP_DIR}/video_{video_id}_scene_{i+1}.mp4"
        duration = scenes[i].get("duration_seconds", 20)

        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", img,
            "-i", audio,
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-vf", f"scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
            "-c:a", "aac",
            "-shortest",
            "-pix_fmt", "yuv420p",
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

    # Assembler toutes les scènes
    cmd_concat = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
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
