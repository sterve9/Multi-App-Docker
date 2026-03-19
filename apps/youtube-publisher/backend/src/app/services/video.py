import os
import asyncio
import httpx
import random
import logging
from PIL import Image, ImageDraw, ImageFont
import textwrap
from app.services.remotion import render_ken_burns

logger = logging.getLogger(__name__)

VIDEO_DIR = "/app/outputs/videos"
TEMP_DIR = "/app/outputs/temp"
THUMBNAIL_DIR = "/app/outputs/thumbnails"
MUSIC_DIR = "/app/assets/music"

MUSIC_STYLES = {
    "educatif":     "calm.mp3",
    "storytelling": "inspiring.mp3",
    "documentaire": "mysterious.mp3",
    "motivation":   "epic.mp3",
    "default":      "calm.mp3",
}

def get_kenburns_filter(duration: int) -> str:
    effects = [
        f"scale=3840:-1,zoompan=z='min(zoom+0.0015,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={duration*25}:s=1920x1080:fps=25",
        f"scale=3840:-1,zoompan=z='if(lte(zoom,1.0),1.3,max(1.0,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={duration*25}:s=1920x1080:fps=25",
        f"scale=3840:-1,zoompan=z='min(zoom+0.001,1.2)':x='if(lte(zoom,1.0),0,x+1)':y='ih/2-(ih/zoom/2)':d={duration*25}:s=1920x1080:fps=25",
        f"scale=3840:-1,zoompan=z='min(zoom+0.001,1.2)':x='if(gte(x,iw-iw/zoom),iw-iw/zoom,x+2)':y='ih/2-(ih/zoom/2)':d={duration*25}:s=1920x1080:fps=25",
        f"scale=3840:-1,zoompan=z='min(zoom+0.001,1.2)':x='iw/2-(iw/zoom/2)':y='if(lte(zoom,1.0),0,y+1)':d={duration*25}:s=1920x1080:fps=25",
    ]
    return random.choice(effects)


# ══════════════════════════════════════════════════════
# 🎨 ÉTAPE 1 — MINIATURE YOUTUBE AUTO-GÉNÉRÉE
# ══════════════════════════════════════════════════════

def generate_thumbnail(video_id: int, title: str, first_image_path: str) -> str:
    os.makedirs(THUMBNAIL_DIR, exist_ok=True)
    output_path = f"{THUMBNAIL_DIR}/video_{video_id}_thumbnail.jpg"

    try:
        bg = Image.open(first_image_path).convert("RGB")
        bg = bg.resize((1280, 720), Image.LANCZOS)

        draw = ImageDraw.Draw(bg)

        overlay = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        for y in range(360, 720):
            alpha = int(180 * (y - 360) / 360)
            overlay_draw.rectangle([(0, y), (1280, y + 1)], fill=(0, 0, 0, alpha))
        bg = Image.alpha_composite(bg.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(bg)

        font_large = None
        font_small = None
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        ]
        for fp in font_paths:
            if os.path.exists(fp):
                try:
                    font_large = ImageFont.truetype(fp, 72)
                    font_small = ImageFont.truetype(fp, 36)
                    break
                except Exception:
                    continue
        if font_large is None:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()

        lines = textwrap.wrap(title, width=28)[:2]
        y_text = 520
        for line in lines:
            draw.text((62, y_text + 3), line, font=font_large, fill=(0, 0, 0, 200))
            draw.text((60, y_text), line, font=font_large, fill=(255, 255, 255))
            y_text += 82

        badge_text = "▶ NOUVEAU"
        badge_x, badge_y = 60, 460
        bbox = draw.textbbox((badge_x, badge_y), badge_text, font=font_small)
        padding = 10
        draw.rounded_rectangle(
            [bbox[0] - padding, bbox[1] - padding, bbox[2] + padding, bbox[3] + padding],
            radius=8,
            fill=(220, 38, 38)
        )
        draw.text((badge_x, badge_y), badge_text, font=font_small, fill=(255, 255, 255))

        bg.save(output_path, "JPEG", quality=95)
        logger.info(f"Miniature générée : {output_path}")
        return output_path

    except Exception as e:
        logger.warning(f"Génération miniature échouée : {e}")
        return None


# ══════════════════════════════════════════════════════
# 📝 ÉTAPE 2 — SOUS-TITRES AUTOMATIQUES (ASS/SRT)
# ══════════════════════════════════════════════════════

def estimate_word_timings(text: str, duration: float) -> list:
    words = text.split()
    if not words:
        return []
    total_chars = sum(len(w) for w in words)
    timings = []
    current_time = 0.0
    for word in words:
        word_duration = (len(word) / total_chars) * duration if total_chars > 0 else duration / len(words)
        timings.append((current_time, current_time + word_duration, word))
        current_time += word_duration
    return timings


def generate_ass_subtitles(video_id: int, scenes: list, audio_durations: list) -> str:
    os.makedirs(TEMP_DIR, exist_ok=True)
    ass_path = f"{TEMP_DIR}/video_{video_id}_subtitles.ass"

    header = """\
[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2.5,0,2,80,80,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def sec_to_ass(s: float) -> str:
        h = int(s // 3600)
        m = int((s % 3600) // 60)
        sec = s % 60
        return f"{h}:{m:02d}:{sec:06.3f}".replace(".", ",")[:11]

    events = []
    current_offset = 0.0

    for i, scene in enumerate(scenes):
        narration = scene.get("narration", "")
        duration = audio_durations[i] if i < len(audio_durations) else scene.get("duration_seconds", 30)
        words = narration.split()

        chunk_size = 8
        chunks = [words[j:j+chunk_size] for j in range(0, len(words), chunk_size)]

        if chunks:
            chunk_duration = duration / len(chunks)
            for k, chunk in enumerate(chunks):
                start = current_offset + k * chunk_duration
                end = start + chunk_duration
                text = " ".join(chunk)
                text = text.replace("{", "").replace("}", "").replace("\\n", " ")
                events.append(
                    f"Dialogue: 0,{sec_to_ass(start)},{sec_to_ass(end)},Default,,0,0,0,,{text}"
                )

        current_offset += duration

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(header)
        f.write("\n".join(events))

    logger.info(f"Sous-titres générés : {ass_path} ({len(events)} lignes)")
    return ass_path


# ══════════════════════════════════════════════════════
# 🎵 ÉTAPE 3 — MUSIQUE DE FOND
# ══════════════════════════════════════════════════════

def get_music_path(style: str) -> str | None:
    music_file = MUSIC_STYLES.get(style.lower(), MUSIC_STYLES["default"])
    music_path = os.path.join(MUSIC_DIR, music_file)
    if os.path.exists(music_path):
        return music_path
    if os.path.exists(MUSIC_DIR):
        for f in os.listdir(MUSIC_DIR):
            if f.endswith(".mp3"):
                logger.info(f"Musique fallback utilisée : {f}")
                return os.path.join(MUSIC_DIR, f)
    logger.warning(f"Aucune musique trouvée dans {MUSIC_DIR}")
    return None


# ══════════════════════════════════════════════════════
# 🎬 ASSEMBLAGE FINAL
# ══════════════════════════════════════════════════════

async def get_audio_duration(audio_path: str) -> float:
    """Récupère la durée réelle d'un fichier audio via ffprobe — minimum 25s garanti"""
    try:
        process = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_streams", audio_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()
        import json
        data = json.loads(stdout)
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "audio":
                duration = float(stream.get("duration", 25))
                # Garantir un minimum de 20s par scène pour éviter les vidéos trop courtes
                return max(duration, 20.0)
    except Exception:
        pass
    return 25.0  # fallback 25s au lieu de 20s


async def assemble_video(
    video_id: int,
    scenes: list,
    image_urls: list,
    audio_files: list,
    style: str = "educatif",
    title: str = "",
    video_format: str = "premium"
) -> dict:
    os.makedirs(VIDEO_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)

    is_premium = (video_format == "premium")

    # ── Télécharger ou copier les visuels ────────────────────────────────────
    image_files = []
    async with httpx.AsyncClient(follow_redirects=True, timeout=120) as client:
        for i, url_or_path in enumerate(image_urls):
            ext = "mp4" if is_premium else "jpg"
            img_path = f"{TEMP_DIR}/video_{video_id}_scene_{i+1}.{ext}"
            if url_or_path.startswith("/") or url_or_path.startswith("./"):
                # Chemin local — copie directe
                import shutil
                shutil.copy2(url_or_path, img_path)
                logger.info(f"Scène {i+1} — visuel copié depuis disque local")
            else:
                # URL distante — téléchargement
                response = await client.get(url_or_path)
                if response.status_code != 200:
                    raise Exception(f"Téléchargement visuel scène {i+1} échoué : HTTP {response.status_code} — URL: {url_or_path}")
                with open(img_path, "wb") as f:
                    f.write(response.content)
                logger.info(f"Scène {i+1} — visuel téléchargé ({len(response.content)} bytes)")
            image_files.append(img_path)

    # ── Récupérer les durées réelles des audios ───────────────────
    audio_durations = []
    for audio_path in audio_files:
        duration = await get_audio_duration(audio_path)
        audio_durations.append(duration)
    total_duration = sum(audio_durations)
    logger.info(f"Durées audio : {audio_durations}")
    logger.info(f"Durée totale estimée : {total_duration:.1f}s ({total_duration/60:.1f} min)")

    # ── Générer les sous-titres ───────────────────────────────────
    ass_path = generate_ass_subtitles(video_id, scenes, audio_durations)

    # ── Générer la miniature (depuis la 1ère image) ───────────────
    thumbnail_path = None
    if image_files and title:
        thumbnail_path = generate_thumbnail(video_id, title, image_files[0])

    # ── Créer une vidéo par scène (en parallèle, max 4 simultanées) ──
    semaphore = asyncio.Semaphore(4)

    async def build_scene(i, img, audio):
        scene_video = f"{TEMP_DIR}/video_{video_id}_scene_{i+1}_out.mp4"
        async with semaphore:
            if is_premium:
                cmd = [
                    "ffmpeg", "-y",
                    "-stream_loop", "-1", "-i", img,
                    "-i", audio,
                    "-map", "0:v", "-map", "1:a",
                    "-c:v", "libx264", "-preset", "ultrafast",
                    "-c:a", "aac",
                    "-shortest",
                    "-pix_fmt", "yuv420p",
                    "-r", "25",
                    scene_video
                ]
            else:
                # Format économique : Remotion génère le Ken Burns, puis FFmpeg mixe l'audio
                duration_ms = int(audio_durations[i] * 1000)
                ken_burns_path = f"{TEMP_DIR}/video_{video_id}_scene_{i+1}_kb.mp4"
                await render_ken_burns(
                    image_path=img,
                    duration_ms=duration_ms,
                    output_path=ken_burns_path,
                    direction=i % 3,  # alterne les directions Ken Burns
                )
                # Merger la vidéo animée avec l'audio de narration
                cmd = [
                    "ffmpeg", "-y",
                    "-i", ken_burns_path,
                    "-i", audio,
                    "-map", "0:v", "-map", "1:a",
                    "-c:v", "libx264", "-preset", "ultrafast",
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
            logger.info(f"Scène {i+1} assemblée ✅")
            return scene_video

    scene_videos = await asyncio.gather(*[
        build_scene(i, img, audio)
        for i, (img, audio) in enumerate(zip(image_files, audio_files))
    ])

    # ── Concaténer toutes les scènes ─────────────────────────────
    concat_file = f"{TEMP_DIR}/video_{video_id}_concat.txt"
    with open(concat_file, "w") as f:
        for sv in scene_videos:
            f.write(f"file '{sv}'\n")

    raw_video = f"{TEMP_DIR}/video_{video_id}_raw.mp4"
    cmd_concat = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_file,
        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        raw_video
    ]
    process = await asyncio.create_subprocess_exec(
        *cmd_concat,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        raise Exception(f"FFmpeg concat error: {stderr.decode()}")

    # ── Incruster les sous-titres ─────────────────────────────────
    subtitled_video = f"{TEMP_DIR}/video_{video_id}_subtitled.mp4"
    ass_escaped = ass_path.replace("\\", "/").replace(":", "\\:")
    cmd_subs = [
        "ffmpeg", "-y",
        "-i", raw_video,
        "-vf", f"subtitles={ass_escaped}",
        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "copy",
        "-pix_fmt", "yuv420p",
        subtitled_video
    ]
    process = await asyncio.create_subprocess_exec(
        *cmd_subs,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        logger.warning(f"Sous-titres échoués, on continue sans : {stderr.decode()[:300]}")
        subtitled_video = raw_video

    # ── Ajouter la musique de fond ────────────────────────────────
    output_path = f"{VIDEO_DIR}/video_{video_id}.mp4"
    music_path = get_music_path(style)

    if music_path:
        logger.info(f"Ajout musique de fond : {music_path}")
        cmd_music = [
            "ffmpeg", "-y",
            "-i", subtitled_video,
            "-stream_loop", "-1", "-i", music_path,
            "-filter_complex",
            "[0:a]volume=1.0[voice];[1:a]volume=0.12[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=3[aout]",
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            "-movflags", "+faststart",
            output_path
        ]
    else:
        logger.info("Pas de musique de fond disponible, vidéo sans musique")
        cmd_music = [
            "ffmpeg", "-y", "-i", subtitled_video,
            "-c", "copy", "-movflags", "+faststart",
            output_path
        ]

    process = await asyncio.create_subprocess_exec(
        *cmd_music,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        raise Exception(f"FFmpeg music mix error: {stderr.decode()}")

    logger.info(f"Vidéo finale assemblée : {output_path}")
    logger.info(f"Durée totale : {total_duration:.1f}s ({total_duration/60:.1f} min)")

    return {
        "video_path": output_path,
        "thumbnail_path": thumbnail_path,
        "subtitles_path": ass_path,
    }