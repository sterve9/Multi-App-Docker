import logging
import httpx
import os
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.config import settings
from app.models.post import Post, PostStatus
from app.schemas.post_request import PostCreateRequest, PostPatchRequest, PostResponse
from app.services.pipeline import run_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/posts", tags=["Posts"])


@router.post("/create", status_code=201)
async def create_post(
    payload: PostCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Crée un post et lance le pipeline immédiatement."""
    post = Post(topic=payload.topic, status=PostStatus.draft)
    db.add(post)
    db.commit()
    db.refresh(post)
    background_tasks.add_task(run_pipeline, post.id)
    return {"post_id": post.id, "message": "Pipeline lancé"}


@router.get("", response_model=List[PostResponse])
def list_posts(
    status: Optional[PostStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Post)
    if status:
        query = query.filter(Post.status == status)
    return query.order_by(Post.created_at.desc()).limit(50).all()


@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post introuvable")
    return post


@router.patch("/{post_id}", response_model=PostResponse)
def update_post(post_id: int, payload: PostPatchRequest, db: Session = Depends(get_db)):
    """Utilisé par n8n après publication LinkedIn."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post introuvable")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(post, field, value)
    db.commit()
    db.refresh(post)
    return post


@router.post("/{post_id}/publish", response_model=PostResponse)
async def publish_post(post_id: int, db: Session = Depends(get_db)):
    """Déclenche le workflow n8n de publication LinkedIn."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post introuvable")
    if post.status != PostStatus.ready:
        raise HTTPException(status_code=400, detail="Le post doit être 'ready' pour être publié")
    if not settings.N8N_WEBHOOK_URL:
        raise HTTPException(status_code=500, detail="N8N_WEBHOOK_URL non configuré")

    post.status = PostStatus.uploading
    db.commit()
    db.refresh(post)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            await client.post(settings.N8N_WEBHOOK_URL, json={"post_id": post.id})
    except Exception as e:
        logger.error(f"Erreur webhook n8n post {post_id}: {e}")
        post.status = PostStatus.ready
        db.commit()
        db.refresh(post)
        raise HTTPException(status_code=502, detail=f"Impossible de joindre n8n : {e}")

    return post


@router.post("/{post_id}/retry", status_code=202)
async def retry_post(
    post_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Relance le pipeline sur un post échoué."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post introuvable")
    if post.status not in [PostStatus.failed, PostStatus.draft, PostStatus.uploading]:
        raise HTTPException(status_code=400, detail=f"Impossible de relancer un post '{post.status}'")
    post.status        = PostStatus.draft
    post.error_message = None
    db.commit()
    background_tasks.add_task(run_pipeline, post.id)
    return {"message": "Pipeline relancé", "post_id": post.id}


@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post introuvable")
    # Supprimer l'image locale si elle existe
    if post.image_filename:
        path = os.path.join(settings.IMAGE_OUTPUT_DIR, post.image_filename)
        if os.path.exists(path):
            os.remove(path)
    db.delete(post)
    db.commit()
    return {"success": True, "message": "Post supprimé"}


@router.get("/image/{filename}")
def download_image(filename: str):
    """Télécharge ou affiche l'image générée — utilisé par n8n et le frontend."""
    # Sécurité : pas de path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")
    path = os.path.join(settings.IMAGE_OUTPUT_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image introuvable")
    return FileResponse(path=path, media_type="image/png", filename=filename)
