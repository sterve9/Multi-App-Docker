"""Sterve Studio — FastAPI backend proxy for KIE AI."""
import os
import uuid
import asyncio
import shutil
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import kie, db

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/uploads"))
PUBLIC_BASE = os.getenv("PUBLIC_BASE", "http://localhost:8001")

app = FastAPI(title="Sterve Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    db.init_db()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ── Upload ────────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image and return its public URL."""
    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(400, "Format non supporté (jpg, png, webp)")
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    url = f"{PUBLIC_BASE}/uploads/{filename}"
    return {"url": url, "filename": filename}


# ── Generate endpoints ────────────────────────────────────────────────────────

class ImageTextRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "16:9"
    resolution: str = "2K"

class ImageFromImageRequest(BaseModel):
    prompt: str
    image_urls: list[str]
    aspect_ratio: str = "16:9"
    resolution: str = "2K"

class AnimateRequest(BaseModel):
    image_url: str
    prompt: str
    duration: str = "5"

class BeforeAfterRequest(BaseModel):
    prompt_avant: str
    prompt_apres: str
    animate_prompt: str = "Smooth cinematic transition, professional reveal, dynamic movement"
    duration: str = "5"
    aspect_ratio: str = "16:9"
    resolution: str = "2K"


@app.post("/generate/image-text")
async def generate_image_text(req: ImageTextRequest):
    job_id = uuid.uuid4().hex
    label = req.prompt[:60]
    try:
        task_id = await kie.create_image_text(req.prompt, req.aspect_ratio, req.resolution)
        db.create_job(job_id, "image-text", label, task_id, {"prompt": req.prompt})
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"job_id": job_id}


@app.post("/generate/image-image")
async def generate_image_image(req: ImageFromImageRequest):
    job_id = uuid.uuid4().hex
    label = req.prompt[:60]
    try:
        task_id = await kie.create_image_from_image(req.prompt, req.image_urls, req.aspect_ratio, req.resolution)
        db.create_job(job_id, "image-image", label, task_id, {"prompt": req.prompt})
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"job_id": job_id}


@app.post("/generate/animate")
async def generate_animate(req: AnimateRequest):
    job_id = uuid.uuid4().hex
    label = req.prompt[:60]
    try:
        task_id = await kie.create_animation(req.image_url, req.prompt, req.duration)
        db.create_job(job_id, "animate", label, task_id, {"prompt": req.prompt})
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"job_id": job_id}


@app.post("/generate/before-after")
async def generate_before_after(req: BeforeAfterRequest, background_tasks: BackgroundTasks):
    """3-step pipeline: image avant + image après + animation de l'après."""
    job_id = uuid.uuid4().hex
    label = f"Avant/Après — {req.prompt_apres[:40]}"
    db.create_job(job_id, "before-after", label, meta={
        "prompt_avant": req.prompt_avant,
        "prompt_apres": req.prompt_apres,
        "animate_prompt": req.animate_prompt,
    })
    background_tasks.add_task(_run_before_after, job_id, req)
    return {"job_id": job_id}


async def _run_before_after(job_id: str, req: BeforeAfterRequest):
    """Background pipeline: NanoBanana×2 → Kling."""
    try:
        # Step 1 — Image avant
        db.update_job(job_id, "step1_avant")
        task_avant = await kie.create_image_text(req.prompt_avant, req.aspect_ratio, req.resolution)

        # Step 2 — Image après (parallel with polling step 1)
        task_apres = await kie.create_image_text(req.prompt_apres, req.aspect_ratio, req.resolution)
        db.update_job(job_id, "step2_apres")

        # Poll both until success
        url_avant = await _poll_until_done(task_avant, timeout=600)
        url_apres = await _poll_until_done(task_apres, timeout=600)

        # Step 3 — Animate the "après" image with Kling
        db.update_job(job_id, "step3_animate")
        task_video = await kie.create_animation(url_apres, req.animate_prompt, req.duration)

        # Poll animation
        url_video = await _poll_until_done(task_video, timeout=600)

        # Done — store avant image + video as results
        db.update_job(job_id, "success", result_urls=[url_avant, url_apres, url_video])

    except Exception as e:
        db.update_job(job_id, "failed", fail_msg=str(e))


async def _poll_until_done(task_id: str, timeout: int = 600) -> str:
    """Poll KIE until success or timeout. Returns first result URL."""
    elapsed = 0
    interval = 4
    while elapsed < timeout:
        await asyncio.sleep(interval)
        result = await kie.poll_task(task_id)
        if result["state"] == "success":
            urls = result["result_urls"]
            if not urls:
                raise ValueError(f"Task {task_id} succeeded but no result URL")
            return urls[0]
        if result["state"] == "fail":
            raise ValueError(f"Task {task_id} failed: {result['fail_msg']}")
        elapsed += interval
        interval = min(interval + 2, 10)  # exponential backoff up to 10s
    raise ValueError(f"Task {task_id} timed out after {timeout}s")


# ── Jobs / polling ────────────────────────────────────────────────────────────

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Poll job status. For simple KIE tasks, also polls KIE directly."""
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job introuvable")

    # For single-task jobs still processing, poll KIE directly
    if job["status"] == "processing" and job.get("kie_task_id") and job["type"] != "before-after":
        try:
            result = await kie.poll_task(job["kie_task_id"])
            if result["state"] == "success":
                db.update_job(job_id, "success", result_urls=result["result_urls"])
                job["status"] = "success"
                job["result_urls"] = result["result_urls"]
            elif result["state"] == "fail":
                db.update_job(job_id, "failed", fail_msg=result["fail_msg"])
                job["status"] = "failed"
                job["fail_msg"] = result["fail_msg"]
            else:
                job["kie_state"] = result["state"]
        except Exception as e:
            job["poll_error"] = str(e)

    return job


@app.get("/history")
def get_history():
    return db.list_jobs(100)


@app.delete("/history/{job_id}")
def delete_history(job_id: str):
    db.delete_job(job_id)
    return {"ok": True}


@app.get("/health")
def health():
    return {"status": "ok"}
