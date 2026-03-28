import asyncio
import os
import random
import subprocess

MUSIC_DIR = "/app/storage/music"
MUSIC_VOLUME = 0.15  # 15% — voix off domine


async def run_ffmpeg(cmd: list) -> tuple[int, str, str]:
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    return process.returncode, stdout.decode(), stderr.decode()


def get_audio_duration(audio_path: str) -> float:
    result = subprocess.run([
        "ffprobe", "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path
    ], capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except:
        return 30.0


def get_video_duration(video_path: str) -> float:
    result = subprocess.run([
        "ffprobe", "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path
    ], capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except:
        return 30.0


def escape_srt_path(path: str) -> str:
    path = path.replace("\\", "/")
    path = path.replace(":", "\\:")
    path = path.replace(" ", "\\ ")
    return path


def pick_random_music() -> str | None:
    if not os.path.isdir(MUSIC_DIR):
        return None
    tracks = [
        os.path.join(MUSIC_DIR, f)
        for f in os.listdir(MUSIC_DIR)
        if f.lower().endswith((".mp3", ".m4a", ".aac", ".wav"))
    ]
    return random.choice(tracks) if tracks else None


def generate_srt(captions: list, total_duration: float, srt_path: str):
    if not captions:
        captions = [""]
    captions = [str(c).strip() for c in captions if c and str(c).strip()]
    if not captions:
        captions = [""]

    interval = total_duration / len(captions)

    def fmt_time(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds - int(seconds)) * 1000)
        return f"{h:02}:{m:02}:{s:02},{ms:03}"

    with open(srt_path, "w", encoding="utf-8") as f:
        for i, caption in enumerate(captions):
            start = i * interval
            end = min((i + 1) * interval - 0.1, total_duration)
            f.write(f"{i+1}\n")
            f.write(f"{fmt_time(start)} --> {fmt_time(end)}\n")
            f.write(f"{caption}\n\n")


def build_audio_filter(music_path: str | None, final_duration: float) -> tuple[list, str]:
    if music_path:
        extra_inputs = ["-i", music_path]
        audio_filter = (
            f"[1:a]volume=1.0[voice];"
            f"[2:a]aloop=-1:size=2e+09,atrim=duration={final_duration:.3f},"
            f"volume={MUSIC_VOLUME}[music];"
            f"[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        )
        return extra_inputs, audio_filter
    else:
        return [], None


SUBTITLE_STYLE = (
    "FontName=Arial,"
    "FontSize=20,"
    "Bold=1,"
    "PrimaryColour=&H00FFFFFF,"
    "OutlineColour=&H00000000,"
    "BackColour=&H80000000,"
    "Outline=2,"
    "Shadow=1,"
    "Alignment=2,"
    "MarginV=100"
)


async def add_subtitles_to_video(
    video_path: str,
    captions: list,
    output_path: str,
    duration: int = 30
) -> str:
    """
    Ajoute des sous-titres sur une vidéo Veo3 déjà générée.
    La vidéo Veo3 a déjà la voix intégrée — on ajoute juste les captions visuelles.
    """
    video_duration = get_video_duration(video_path)
    final_duration = min(video_duration, float(duration) + 2.0)

    srt_path = output_path.replace(".mp4", ".srt")
    generate_srt(captions, final_duration, srt_path)
    srt_escaped = escape_srt_path(srt_path)

    print(f"[ffmpeg-subs] Ajout sous-titres sur {os.path.basename(video_path)}")

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"subtitles={srt_escaped}:force_style='{SUBTITLE_STYLE}'",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "copy",  # Garder l'audio Veo3 intact
        "-t", str(final_duration),
        "-movflags", "+faststart",
        output_path
    ]

    rc, _, stderr = await run_ffmpeg(cmd)
    if rc != 0:
        raise Exception(f"FFmpeg subtitles error: {stderr}")

    print(f"[ffmpeg-subs] Sous-titres ajoutés : {output_path}")
    return output_path


async def assemble_video(
    audio_path: str,
    visuals_path,
    captions_data: list,
    output_path: str,
    duration: int = 30
) -> str:
    """Assemble audio + visuels images + musique + sous-titres en MP4 1080x1920"""

    audio_duration = get_audio_duration(audio_path)
    max_duration = float(duration) + 1.0
    final_duration = min(audio_duration, max_duration)

    srt_path = output_path.replace(".mp4", ".srt")
    generate_srt(captions_data, final_duration, srt_path)

    if not os.path.exists(srt_path) or os.path.getsize(srt_path) == 0:
        raise Exception(f"SRT file manquant ou vide : {srt_path}")

    srt_escaped = escape_srt_path(srt_path)
    music_path = pick_random_music()

    if music_path:
        print(f"[ffmpeg] Musique de fond : {os.path.basename(music_path)}")
    else:
        print("[ffmpeg] Aucune musique trouvée — voix seule")

    # ── Multi-images ──────────────────────────────────────────────────────────
    if isinstance(visuals_path, list) and len(visuals_path) > 1:
        return await _assemble_multi_image(
            audio_path, visuals_path, srt_escaped,
            SUBTITLE_STYLE, output_path, final_duration, music_path
        )

    # ── Image unique ou vidéo ─────────────────────────────────────────────────
    single_path = visuals_path if isinstance(visuals_path, str) else visuals_path[0]
    ext = os.path.splitext(single_path)[1].lower()
    is_image = ext in [".jpg", ".jpeg", ".png", ".webp"]

    extra_inputs, audio_filter = build_audio_filter(music_path, final_duration)

    if is_image:
        fps = 25
        total_frames = int(final_duration * fps)
        vf = ",".join([
            "scale=1188:2112:force_original_aspect_ratio=increase",
            "crop=1188:2112",
            f"crop=1080:1920:x='(1188-1080)/2':y='(2112-1920)*n/{total_frames}'",
            f"subtitles={srt_escaped}:force_style='{SUBTITLE_STYLE}'"
        ])
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-framerate", "25",
            "-i", single_path,
            "-i", audio_path,
            *extra_inputs,
            "-vf", vf,
        ]
    else:
        vf = ",".join([
            "scale=1080:1920:force_original_aspect_ratio=increase",
            "crop=1080:1920",
            f"subtitles={srt_escaped}:force_style='{SUBTITLE_STYLE}'"
        ])
        cmd = [
            "ffmpeg", "-y",
            "-i", single_path,
            "-i", audio_path,
            *extra_inputs,
            "-vf", vf,
        ]

    if audio_filter:
        cmd += ["-filter_complex", audio_filter, "-map", "0:v", "-map", "[aout]"]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]

    cmd += [
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-t", str(final_duration),
        "-r", "25",
        "-movflags", "+faststart",
        output_path
    ]

    rc, _, stderr = await run_ffmpeg(cmd)
    if rc != 0:
        raise Exception(f"FFmpeg error: {stderr}")
    return output_path


async def _assemble_multi_image(
    audio_path: str,
    image_paths: list,
    srt_escaped: str,
    subtitle_style: str,
    output_path: str,
    final_duration: float,
    music_path: str | None = None
) -> str:
    """Ken Burns multi-images + audio + sous-titres"""
    fps = 25
    n = len(image_paths)
    transition_dur = 0.5
    seg_duration = final_duration / n

    segment_paths = []
    for i, img_path in enumerate(image_paths):
        seg_path = output_path.replace(".mp4", f"_seg{i}.mp4")
        seg_frames = int(seg_duration * fps)

        if i % 2 == 0:
            y_expr = f"(2112-1920)*n/{seg_frames}"
        else:
            y_expr = f"(2112-1920)*(1-n/{seg_frames})"

        vf_seg = ",".join([
            "scale=1188:2112:force_original_aspect_ratio=increase",
            "crop=1188:2112",
            f"crop=1080:1920:x='(1188-1080)/2':y='{y_expr}'",
            "setsar=1"
        ])

        cmd_seg = [
            "ffmpeg", "-y",
            "-loop", "1", "-framerate", str(fps),
            "-i", img_path,
            "-vf", vf_seg,
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18",
            "-t", str(seg_duration),
            "-r", str(fps),
            "-an", seg_path
        ]

        rc, _, stderr = await run_ffmpeg(cmd_seg)
        if rc != 0:
            raise Exception(f"FFmpeg segment {i} error: {stderr}")
        segment_paths.append(seg_path)

    if n == 1:
        merged_path = segment_paths[0]
    else:
        merged_path = output_path.replace(".mp4", "_merged.mp4")
        inputs = []
        for sp in segment_paths:
            inputs += ["-i", sp]

        filter_parts = []
        prev_label = "[0:v]"
        for i in range(1, n):
            offset = round(seg_duration * i - transition_dur * i, 3)
            out_label = "[vout]" if i == n - 1 else f"[vx{i}]"
            filter_parts.append(
                f"{prev_label}[{i}:v]xfade=transition=fade:"
                f"duration={transition_dur}:offset={offset}{out_label}"
            )
            prev_label = f"[vx{i}]"

        cmd_merge = [
            "ffmpeg", "-y", *inputs,
            "-filter_complex", ";".join(filter_parts),
            "-map", "[vout]",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-r", str(fps), merged_path
        ]

        rc, _, stderr = await run_ffmpeg(cmd_merge)
        if rc != 0:
            raise Exception(f"FFmpeg xfade error: {stderr}")

    extra_inputs, audio_filter = build_audio_filter(music_path, final_duration)

    cmd_final = [
        "ffmpeg", "-y",
        "-i", merged_path,
        "-i", audio_path,
        *extra_inputs,
        "-vf", f"subtitles={srt_escaped}:force_style='{subtitle_style}'",
    ]

    if audio_filter:
        cmd_final += ["-filter_complex", audio_filter, "-map", "0:v", "-map", "[aout]"]
    else:
        cmd_final += ["-map", "0:v", "-map", "1:a"]

    cmd_final += [
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-t", str(final_duration),
        "-movflags", "+faststart",
        output_path
    ]

    rc, _, stderr = await run_ffmpeg(cmd_final)
    if rc != 0:
        raise Exception(f"FFmpeg final assembly error: {stderr}")

    for sp in segment_paths:
        try: os.remove(sp)
        except: pass
    if merged_path != segment_paths[0]:
        try: os.remove(merged_path)
        except: pass

    return output_path