"""
Routes API pour la gestion des posts LinkedIn
"""

# =====================================================
# IMPORTS FRAMEWORK & STDLIB
# =====================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List


# =====================================================
# IMPORTS INTERNES (CORRIGÉS)
# =====================================================
# AVANT (cassé) :
# from app.core.database import get_db
# from app.models.post import LinkedInPost
# from app.schemas.post_request import PostCreateRequest, PostResponse
# from app.services.n8n_trigger import N8NTriggerService
#
# APRÈS (correct, aligné avec src.app)

from app.core.database import get_db
from app.models.post import LinkedInPost
from app.schemas.post_request import PostCreateRequest, PostResponse
from app.services.n8n_trigger import N8NTriggerService


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(prefix="/posts", tags=["Posts"])

n8n_service = N8NTriggerService()


# =====================================================
# CREATE POST
# =====================================================

@router.post("", status_code=201, response_model=PostResponse)
async def create_post(
    payload: PostCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Créer un nouveau post LinkedIn

    Le post est créé avec le status 'draft', puis
    un workflow N8N est déclenché en arrière-plan.
    """
    try:
        # Création du post en base
        post = LinkedInPost(
            user_id=payload.user_id,
            raw_content=payload.raw_content,
            post_type=payload.post_type,
            status="draft"
        )

        db.add(post)
        db.commit()
        db.refresh(post)

        # Déclenchement du workflow N8N (non bloquant)
        try:
            await n8n_service.trigger_post_workflow(
                post_id=post.id,
                user_id=post.user_id
            )
        except Exception as e:
            # On log l'erreur mais on ne bloque pas la création
            print(f"⚠️  Erreur N8N webhook: {e}")

        return post

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur création post: {str(e)}"
        )


# =====================================================
# LIST POSTS
# =====================================================

@router.get("", response_model=List[PostResponse])
def list_posts(
    user_id: int = None,
    status: str = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Lister les posts

    Filtres optionnels :
    - user_id : posts d'un utilisateur
    - status : draft, published, etc.
    - limit : nombre maximum de résultats
    """
    query = db.query(LinkedInPost)

    if user_id:
        query = query.filter(LinkedInPost.user_id == user_id)

    if status:
        query = query.filter(LinkedInPost.status == status)

    posts = (
        query
        .order_by(LinkedInPost.created_at.desc())
        .limit(limit)
        .all()
    )

    return posts


# =====================================================
# GET POST BY ID
# =====================================================

@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    """
    Récupérer un post par son ID
    """
    post = db.query(LinkedInPost).filter(LinkedInPost.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return post


# =====================================================
# DELETE POST
# =====================================================

@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    """
    Supprimer un post
    """
    post = db.query(LinkedInPost).filter(LinkedInPost.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    db.delete(post)
    db.commit()

    return {"success": True, "message": "Post deleted"}
