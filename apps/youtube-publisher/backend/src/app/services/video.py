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
    
    # Créer un fichier de concat pour FFmpeg
    concat_file = f"{TEMP_DIR}/video_{video_id}_concat.txt"
    output_path = f"{VIDEO_DIR}/video_{video_id}.mp4"
    
    with open(concat_file, "w") as f:
        for i, (img, audio) in enumerate(zip(image_files, audio_files)):
            duration = scenes[i].get("duration_seconds", 20)
            f.write(f"file '{img}'\n")
            f.write(f"duration {duration}\n")
    
    # Assembler avec FFmpeg (image + audio par scène)
    filter_parts = []
    inputs = []
    
    for i, (img, audio) in enumerate(zip(image_files, audio_files)):
        duration = scenes[i].get("duration_seconds", 20)
        inputs.extend(["-loop", "1", "-t", str(duration), "-i", img])
        inputs.extend(["-i", audio])
    
    n = len(image_files)
    for i in range(n):
        filter_parts.append(f"[{i*2}]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.001,1.3)':d={scenes[i].get('duration_seconds', 20)*25}:s=1920x1080[v{i}]")
    
    video_concat = "".join([f"[v{i}]" for i in range(n)]) + f"concat=n={n}:v=1:a=0[vout]"
    audio_concat = "".join([f"[{i*2+1}]" for i in range(n)]) + f"concat=n={n}:v=0:a=1[aout]"
    
    filter_complex = ";".join(filter_parts) + ";" + video_concat + ";" + audio_concat
    
    cmd = ["ffmpeg", "-y"] + inputs + [
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-c:a", "aac",
        "-shortest", output_path
    ]
    
    process = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stderr = await process.communicate()
    
    if process.returncode != 0:
        raise Exception(f"FFmpeg error: {stderr.decode()}")
    
    return output_path
