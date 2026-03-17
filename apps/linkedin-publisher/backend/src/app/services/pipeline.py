import logging
from app.core.database import SessionLocal
from app.models.post import Post, PostStatus
from app.services.content import generate_content
from app.services.image import generate_image

logger = logging.getLogger(__name__)


async def run_pipeline(post_id: int):
    """
    Pipeline complet :
    1. Claude → hook + reflection + image_prompt + processed_content
    2. kie.ai nano-banana-pro → image 9:16
    3. status = ready
    """
    db = SessionLocal()
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            logger.error(f"Post {post_id} introuvable")
            return

        # ── Étape 1 : Contenu Claude ──────────────────────────────────
        post.status = PostStatus.processing
        db.commit()
        logger.info(f"Post {post_id} — génération contenu Claude...")

        content = await generate_content(post.topic)
        post.hook              = content["hook"]
        post.reflection        = content["reflection"]
        post.image_prompt      = content["image_prompt"]
        post.processed_content = content["processed_content"]
        db.commit()
        logger.info(f"Post {post_id} — contenu généré ✅")

        # ── Étape 2 : Image kie.ai ────────────────────────────────────
        logger.info(f"Post {post_id} — génération image nano-banana-pro...")
        filename = await generate_image(post.image_prompt, post_id)
        post.image_filename = filename
        db.commit()
        logger.info(f"Post {post_id} — image générée ✅ ({filename})")

        # ── Étape 3 : Prêt ───────────────────────────────────────────
        post.status = PostStatus.ready
        db.commit()
        logger.info(f"Post {post_id} — pipeline terminé ✅")

    except Exception as e:
        logger.error(f"Post {post_id} — pipeline échoué : {e}")
        try:
            post = db.query(Post).filter(Post.id == post_id).first()
            if post:
                post.status        = PostStatus.failed
                post.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
