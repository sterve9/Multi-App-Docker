import logging
import asyncio
import subprocess
from pathlib import Path
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# Limite globale : max 2 FFmpeg Ken Burns simultanés (économie mémoire)
_ffmpeg_semaphore = asyncio.Semaphore(2)


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
        logger.info("REMOTION_SERVICE_URL non configuré, Ken Burns FFmpeg")
        return await _ffmpeg_ken_burns(image_path, duration_ms, output_path, direction)

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
        logger.warning(f"Remotion indisponible ({e}), Ken Burns FFmpeg pour {image_path}")
        return await _ffmpeg_ken_burns(image_path, duration_ms, output_path, direction)


async def _ffmpeg_ken_burns(image_path: str, duration_ms: int, output_path: str, direction: int = 0) -> str:
    """FFmpeg Ken Burns rapide : scale oversized + crop linéaire.
    Limité à 3 processus simultanés via semaphore global.
    """
    async with _ffmpeg_semaphore:
        return await _ffmpeg_ken_burns_inner(image_path, duration_ms, output_path, direction)


async def _ffmpeg_ken_burns_inner(image_path: str, duration_ms: int, output_path: str, direction: int = 0) -> str:
    duration_sec = max(1, duration_ms / 1000)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Scale à 110% pour avoir de la marge de pan (2112x1188 ≈ 1920*1.1)
    # Puis crop 1920x1080 qui se déplace linéairement selon t
    pan_x = 192  # pixels disponibles en X (2112 - 1920)
    pan_y = 108  # pixels disponibles en Y (1188 - 1080)

    if direction == 1:
        # Pan haut-gauche → bas-droite
        crop_filter = (
            f"scale=2112:1188:force_original_aspect_ratio=increase,"
            f"crop=1920:1080:x='min({pan_x}*t/{duration_sec},{pan_x})':y='min({pan_y}*t/{duration_sec},{pan_y})'"
        )
    elif direction == 2:
        # Pan bas-droite → haut-gauche
        crop_filter = (
            f"scale=2112:1188:force_original_aspect_ratio=increase,"
            f"crop=1920:1080:x='{pan_x}-min({pan_x}*t/{duration_sec},{pan_x})':y='{pan_y}-min({pan_y}*t/{duration_sec},{pan_y})'"
        )
    else:
        # Zoom progressif au centre (crop qui rétrécit du bord vers centre)
        crop_filter = (
            f"scale=2112:1188:force_original_aspect_ratio=increase,"
            f"crop=1920:1080:x='{pan_x}/2-min({pan_x}/2*t/{duration_sec},{pan_x}/2)':y='{pan_y}/2-min({pan_y}/2*t/{duration_sec},{pan_y}/2)'"
        )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", image_path,
        "-t", str(duration_sec),
        "-vf", crop_filter,
        "-c:v", "libx264", "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
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
        logger.warning(f"FFmpeg Ken Burns failed, retrying static: {stderr.decode()[-200:]}")
        return await _ffmpeg_static(image_path, duration_ms, output_path)

    logger.info(f"FFmpeg Ken Burns OK (dir={direction}): {output_path}")
    return output_path


async def _ffmpeg_static(image_path: str, duration_ms: int, output_path: str) -> str:
    """Fallback ultime : image statique sans animation."""
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
