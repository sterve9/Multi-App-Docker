"""
Test du service Claude
"""
import sys
sys.path.insert(0, 'src')

from app.services.claude_linkedin import ClaudeLinkedInService

# Initialiser le service
claude = ClaudeLinkedInService()

# Test
raw_content = """
Aujourdhui jai reussi a automatiser mes posts LinkedIn !

Le systeme utilise FastAPI + Claude + Replicate pour generer du contenu et des images automatiquement.

C'est incroyable ce qu'on peut faire avec l'IA maintenant.
"""

print("🧪 Test amélioration de post...\n")
print(f"Input:\n{raw_content}\n")

result = claude.improve_post(
    raw_content=raw_content,
    post_type="milestone",
    user_name="Sterve"
)

print("✅ Output:")
print(f"Title: {result['title']}")
print(f"\nContent:\n{result['content']}")
print(f"\nImage Prompt:\n{result['image_prompt']}")

# Test bullets
print("\n" + "="*50)
print("🧪 Test génération bullets...\n")

bullets = claude.generate_bullets(result['content'])

print("✅ Bullets:")
print(f"1. {bullets['bullet1']}")
print(f"2. {bullets['bullet2']}")
print(f"3. {bullets['bullet3']}")
