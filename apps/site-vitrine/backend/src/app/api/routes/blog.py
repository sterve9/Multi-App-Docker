from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.blog import Blog
from app.models.user import User
from app.schemas.blog import BlogCreate, BlogUpdate, BlogResponse

router = APIRouter(prefix="/api/blog", tags=["Blog"])

# Limite mensuelle par plan
PLAN_LIMITS = {
    "free": 3,
    "pro": 999999,
}


# ===============================
# SCHÉMA GÉNÉRATION IA
# ===============================

class GenerateRequest(BaseModel):
    topic: str
    tone: str = "professionnel"


# ===============================
# HELPER — reset quota si nouveau mois
# ===============================

def check_and_reset_quota(user: User, db: Session) -> int:
    """Vérifie et remet à zéro le compteur si on est dans un nouveau mois. Retourne les générations restantes."""
    now = datetime.now(timezone.utc)

    # Premier appel : initialiser generation_reset
    if user.generation_reset is None:
        if now.month == 12:
            next_reset = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            next_reset = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        user.generation_reset = next_reset
        user.generation_count = 0
        db.commit()
        db.refresh(user)

    # Reset si on a dépassé la date de reset
    reset_dt = user.generation_reset
    if reset_dt.tzinfo is None:
        reset_dt = reset_dt.replace(tzinfo=timezone.utc)

    if now >= reset_dt:
        user.generation_count = 0
        if now.month == 12:
            next_reset = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            next_reset = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        user.generation_reset = next_reset
        db.commit()
        db.refresh(user)

    limit = PLAN_LIMITS.get(user.plan, 3)
    return max(0, limit - user.generation_count)


# =========================
# CREATE (AUTH USER)
# =========================

@router.post("/", response_model=BlogResponse, status_code=status.HTTP_201_CREATED)
def create_blog(
    blog: BlogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Créer un article manuellement."""
    existing = db.query(Blog).filter(Blog.slug == blog.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un article avec ce slug existe déjà",
        )
    db_blog = Blog(**blog.dict(), owner_id=current_user.id)
    db.add(db_blog)
    db.commit()
    db.refresh(db_blog)
    return db_blog


# =========================
# GENERATE BLOG VIA IA — quota mensuel par plan
# =========================

@router.post("/generate", response_model=BlogResponse, status_code=status.HTTP_201_CREATED)
async def generate_blog(
    request: Request,
    body: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Génère automatiquement un article de blog via IA (Claude).
    - Authentification requise
    - Quota mensuel : 3/mois plan gratuit, illimité plan pro
    - Sauvegardé en brouillon (is_published=False)
    """
    from app.services.claude_service import ClaudeService
    from app.core.config import settings

    # Vérification quota mensuel
    remaining = check_and_reset_quota(current_user, db)
    if remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Quota mensuel atteint ({PLAN_LIMITS.get(current_user.plan, 3)} générations/mois). Passez au plan Pro pour un accès illimité.",
        )

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service IA non configuré — ANTHROPIC_API_KEY manquante",
        )

    try:
        service = ClaudeService()
        generated = await service.generate_blog_article(
            topic=body.topic,
            tone=body.tone,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur génération IA : {str(e)}",
        )

    slug = generated.get("slug", "article-genere")
    existing = db.query(Blog).filter(Blog.slug == slug).first()
    if existing:
        import time
        slug = f"{slug}-{int(time.time())}"

    db_blog = Blog(
        title=generated["title"],
        slug=slug,
        excerpt=generated.get("excerpt", ""),
        content=generated["content"],
        is_published=False,
        owner_id=current_user.id,
    )
    db.add(db_blog)

    # Incrémenter le compteur
    current_user.generation_count += 1
    db.commit()
    db.refresh(db_blog)
    return db_blog


# =========================
# GET ALL BLOGS (PUBLIC)
# =========================

@router.get("/", response_model=List[BlogResponse])
def get_blogs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=50),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Liste des articles publiés — public, sans authentification."""
    query = db.query(Blog).filter(Blog.is_published == True)
    if search:
        query = query.filter(Blog.title.ilike(f"%{search}%"))
    skip = (page - 1) * limit
    return query.offset(skip).limit(limit).all()


# =========================
# GET MY BLOGS
# =========================

@router.get("/me", response_model=List[BlogResponse])
def get_my_blogs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=50),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mes articles — privé. Inclut brouillons. Pagination et recherche."""
    query = db.query(Blog).filter(Blog.owner_id == current_user.id)
    if search:
        query = query.filter(Blog.title.ilike(f"%{search}%"))
    skip = (page - 1) * limit
    return query.offset(skip).limit(limit).all()


# =========================
# GET BLOG BY SLUG (PUBLIC)
# =========================

@router.get("/slug/{slug}", response_model=BlogResponse)
def get_blog_by_slug(slug: str, db: Session = Depends(get_db)):
    """Lire un article par son slug — public."""
    blog = db.query(Blog).filter(
        Blog.slug == slug,
        Blog.is_published == True
    ).first()
    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article introuvable")
    return blog


# =========================
# UPDATE BLOG (OWNER ONLY)
# =========================

@router.put("/{blog_id}", response_model=BlogResponse)
def update_blog(
    blog_id: int,
    blog_update: BlogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Modifier un article — propriétaire uniquement."""
    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.owner_id == current_user.id
    ).first()
    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article introuvable ou accès refusé")

    update_data = blog_update.dict(exclude_unset=True)
    if "slug" in update_data and update_data["slug"] != blog.slug:
        existing = db.query(Blog).filter(Blog.slug == update_data["slug"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un article avec ce slug existe déjà")

    for field, value in update_data.items():
        setattr(blog, field, value)

    db.commit()
    db.refresh(blog)
    return blog


# =========================
# DELETE BLOG (OWNER ONLY)
# =========================

@router.delete("/{blog_id}", status_code=status.HTTP_200_OK)
def delete_blog(
    blog_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supprimer un article — propriétaire uniquement."""
    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.owner_id == current_user.id
    ).first()
    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article introuvable ou accès refusé")

    db.delete(blog)
    db.commit()
    return {"message": "Article supprimé avec succès"}