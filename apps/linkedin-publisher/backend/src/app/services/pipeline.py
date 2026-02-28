"""
Pipeline LinkedIn : Claude → Replicate → Overlay → Ready → N8N
"""
import asyncio
import logging
from app.core.database import SessionLocal
from app.models.post import LinkedInPost, PostStatus
from app.services.claude_linkedin import ClaudeLinkedInService
from app.services.replicate_service import ReplicateService
from app.services.image_overlay import ImageOverlayService
from app.services.n8n_trigger import N8NTriggerService
from app.services.telegram import notify_post_ready, notify_post_failed

logger = logging.getLogger(__name__)

claude_service    = ClaudeLinkedInService()
replicate_service = ReplicateService()
overlay_service   = ImageOverlayService()
n8n_service       = N8NTriggerService()


async def run_post_pipeline(post_id: int):
    """Pipeline complet : améliore post + génère image + notifie n8n"""
    db = SessionLocal()
    try:
        post = db.query(LinkedInPost).filter(LinkedInPost.id == post_id).first()
        if not post:
            raise Exception(f"Post {post_id} introuvable")

        # Étape 1 — Processing
        post.status = PostStatus.PROCESSING
        db.commit()
        logger.info(f"Pipeline post {post_id} — démarrage")

        # Étape 2 — Claude améliore le post
        logger.info(f"Post {post_id} — Claude en cours...")
        claude_result = await claude_service.improve_post(
            raw_content=post.raw_content,
            post_type=post.post_type,
        )
        post.processed_content = claude_result["content"]
        post.title             = claude_result["title"]
        post.image_prompt      = claude_result["image_prompt"]
        db.commit()

        # Étape 3 — Claude génère les bullets
        logger.info(f"Post {post_id} — génération bullets...")
        bullets = await claude_service.generate_bullets(post.processed_content)
        post.bullets = bullets
        db.commit()

        # Étape 4 — Replicate génère l'image (synchrone → thread pool)
        logger.info(f"Post {post_id} — Replicate en cours...")
        loop = asyncio.get_event_loop()
        image_url = await loop.run_in_executor(
            None,
            lambda: replicate_service.generate_image(post.image_prompt)
        )
        post.replicate_image_url = image_url
        db.commit()

        # Étape 5 — Overlay titre + bullets sur l'image
        logger.info(f"Post {post_id} — création overlay...")
        final_image_path = await loop.run_in_executor(
            None,
            lambda: overlay_service.create_linkedin_overlay(
                image_url=image_url,
                title=post.title,
                bullets=bullets
            )
        )
        post.final_image_path = final_image_path
        db.commit()

        # Étape 6 — Status ready
        post.status = PostStatus.READY
        db.commit()
        logger.info(f"Post {post_id} — prêt ✅")

        # Étape 7 — Notification Telegram
        await notify_post_ready(post_id=post_id, title=post.title)

        # Étape 8 — Trigger n8n pour publication LinkedIn
        await n8n_service.trigger_publish_workflow(
            post_id=post_id,
            processed_content=post.processed_content,
            final_image_path=final_image_path,
        )

    except Exception as e:
        logger.error(f"Pipeline post {post_id} échoué : {e}")
        try:
            post = db.query(LinkedInPost).filter(LinkedInPost.id == post_id).first()
            if post:
                post.status = PostStatus.FAILED
                db.commit()
        except Exception:
            pass
        await notify_post_failed(post_id=post_id, error=str(e))

    finally:
        db.close()
