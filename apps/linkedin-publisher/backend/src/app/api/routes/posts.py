"""
Routes API pour la gestion des posts LinkedIn
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.post import LinkedInPost, PostStatus
from app.schemas.post_request import PostCreateRequest, PostResponse
from app.services.pipeline import run_post_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/posts", tags=["Posts"])


class PostUpdateRequest(BaseModel):
    processed_content: Optional[str] = None
    title: Optional[str] = None
    bullets: Optional[List[str]] = None
    image_prompt: Optional[str] = None
    replicate_image_url: Optional[str] = None
    final_image_path: Optional[str] = None
    status: Optional[str] = None


@router.post("", status_code=201, response_model=PostResponse)
async def create_post(
    payload: PostCreateRequest,
    db: Session = Depends(get_db)
):
    """Créer un nouveau post LinkedIn en brouillon"""
    try:
        post = LinkedInPost(
            user_id=payload.user_id,
            raw_content=payload.raw_content,
            post_type=payload.post_type,
            status=PostStatus.DRAFT
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        return post

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating post: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur création post: {str(e)}")


@router.post("/{post_id}/run", status_code=202)
async def run_post(
    post_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Lance le pipeline IA : Claude → Replicate → Overlay → n8n"""
    post = db.query(LinkedInPost).filter(LinkedInPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status == PostStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Post déjà en cours de traitement")

    background_tasks.add_task(run_post_pipeline, post_id)
    return {"message": "Pipeline lancé", "post_id": post_id}


@router.post("/{post_id}/resume", status_code=202)
async def resume_post(
    post_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Relance le pipeline sur un post échoué"""
    post = db.query(LinkedInPost).filter(LinkedInPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status not in [PostStatus.FAILED, PostStatus.DRAFT]:
        raise HTTPException(status_code=400, detail=f"Impossible de relancer un post avec le statut '{post.status}'")

    background_tasks.add_task(run_post_pipeline, post_id)
    return {"message": "Pipeline relancé", "post_id": post_id}


@router.get("", response_model=List[PostResponse])
def list_posts(
    user_id: Optional[int] = None,
    status: Optional[PostStatus] = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Lister les posts avec filtres optionnels"""
    query = db.query(LinkedInPost)
    if user_id:
        query = query.filter(LinkedInPost.user_id == user_id)
    if status:
        query = query.filter(LinkedInPost.status == status)
    return query.order_by(LinkedInPost.created_at.desc()).limit(limit).all()


@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    """Récupérer un post par son ID"""
    post = db.query(LinkedInPost).filter(LinkedInPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.patch("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    payload: PostUpdateRequest,
    db: Session = Depends(get_db)
):
    """Mettre à jour un post — utilisé par n8n après publication"""
    post = db.query(LinkedInPost).filter(LinkedInPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    allowed_fields = [
        "processed_content", "title", "bullets", "image_prompt",
        "replicate_image_url", "final_image_path", "status"
    ]

    for field, value in payload.model_dump(exclude_none=True).items():
        if field in allowed_fields:
            setattr(post, field, value)

    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    """Supprimer un post"""
    post = db.query(LinkedInPost).filter(LinkedInPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
    return {"success": True, "message": "Post deleted"}