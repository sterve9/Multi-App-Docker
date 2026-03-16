import logging
import asyncio
import subprocess
from pathlib import Path
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


async def render_ken_burns(image_path: str, duration_ms: int, output_path: str, direction: int = 0) -> str:
    """
    Anime une image avec l'effet Ken Burns via le service Remotion.
    Fallback sur FFmpeg image statique si le service n'est pas disponible.

    Args:
        image_path: chemin absolu de l'image source
        duration_ms: durée du clip en millisecondes
        output_path: chemin absolu du MP4 de sortie
        direction: 0=zoom centre, 1=zoom haut-gauche, 2=zoom bas-droite

    Returns:
        output_path si succès
    """
    if not settings.REMOTION_SERVICE_URL:
        logger.info("REMOTION_SERVICE_URL non configuré, fallback FFmpeg")
        return await _ffmpeg_static(image_path, duration_ms, output_path)

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                f"{settings.REMOTION_SERVICE_URL}/render",
                json={
                    "image_path": image_path,
                    "duration_ms": duration_ms,
                    "output_path": output_path,
                    "direction": direction,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("success"):
                logger.info(f"Remotion Ken Burns OK: {output_path}")
                return output_path
            raise RuntimeError(data.get("error", "Remotion error inconnu"))
    except Exception as e:
        logger.warning(f"Remotion indisponible ({e}), fallback FFmpeg pour {image_path}")
        return await _ffmpeg_static(image_path, duration_ms, output_path)


async def _ffmpeg_static(image_path: str, duration_ms: int, output_path: str) -> str:
    """Fallback FFmpeg : image statique simple sans animation."""
    duration_sec = max(1, duration_ms / 1000)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", image_path,
        "-t", str(duration_sec),
        "-c:v", "libx264", "-preset", "ultrafast",
        "-tune", "stillimage",
        "-pix_fmt", "yuv420p",
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
        "-r", "25",
        "-an",
        output_path,
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg static fallback failed: {stderr.decode()[-500:]}")

    logger.info(f"FFmpeg static fallback OK: {output_path}")
    return output_path
