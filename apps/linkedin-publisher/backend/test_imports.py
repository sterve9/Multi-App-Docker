"""
Script de test rapide pour vérifier que tous les imports fonctionnent
"""
import sys
sys.path.insert(0, 'src')

print("🧪 Test des imports...\n")

try:
    print("✓ Config...")
    from app.core.config import settings
    
    print("✓ Database...")
    from app.core.database import Base, engine
    
    print("✓ Models...")
    from app.models.user import User
    from app.models.post import LinkedInPost
    
    print("✓ Schemas...")
    from app.schemas.post_request import PostCreateRequest
    from app.schemas.image_request import ImageOverlayRequest
    
    print("✓ Services...")
    from app.services.claude_linkedin import ClaudeLinkedInService
    from app.services.replicate_service import ReplicateService
    from app.services.image_overlay import ImageOverlayService
    from app.services.n8n_trigger import N8NTriggerService
    
    print("✓ Routes...")
    from app.api.routes import posts, images
    
    print("\n✅ Tous les imports fonctionnent !")
    print(f"📊 Database URL: {settings.DATABASE_URL}")
    print(f"🔑 Anthropic API Key: {'✓ Configurée' if settings.ANTHROPIC_API_KEY else '✗ Manquante'}")
    print(f"🔑 Replicate Token: {'✓ Configuré' if settings.REPLICATE_API_TOKEN else '✗ Manquant'}")

except Exception as e:
    print(f"\n❌ Erreur : {e}")
    import traceback
    traceback.print_exc()
