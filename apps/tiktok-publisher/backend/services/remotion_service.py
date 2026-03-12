import asyncio
import os
import json

async def render_with_remotion(
    captions: list,
    audio_path: str,
    visuals_path: str,
    output_path: str,
    duration: int = 30
) -> str:
    """Lance le rendu Remotion pour les captions animées"""

    remotion_dir = "/app/remotion"

    # Props à passer à Remotion
    props = {
        "captions": captions,
        "audioPath": audio_path,
        "visualsPath": visuals_path,
        "durationInSeconds": duration
    }

    props_path = output_path.replace(".mp4", "_props.json")
    with open(props_path, "w") as f:
        json.dump(props, f)

    cmd = [
        "npx", "remotion", "render",
        "CaptionVideo",
        output_path,
        "--props", props_path,
        "--overwrite"
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=remotion_dir,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        # Fallback sur FFmpeg si Remotion échoue
        from .ffmpeg_service import assemble_video
        return await assemble_video(audio_path, visuals_path, captions, output_path, duration)

    return output_path
