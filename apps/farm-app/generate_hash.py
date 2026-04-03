"""
Utilitaire pour générer le hash bcrypt du mot de passe admin.
Usage : python generate_hash.py
"""
import getpass

try:
    from passlib.context import CryptContext
except ImportError:
    print("Installation de passlib...")
    import subprocess
    subprocess.check_call(["pip", "install", "passlib[bcrypt]", "--break-system-packages", "-q"])
    from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("=== Générateur de hash mot de passe Farm Manager ===\n")
password = getpass.getpass("Entrez le mot de passe : ")
confirm = getpass.getpass("Confirmez le mot de passe : ")

if password != confirm:
    print("❌ Les mots de passe ne correspondent pas.")
    exit(1)

hashed = pwd_context.hash(password)
print(f"\n✅ Hash généré :\n{hashed}")
print(f"\nCopie cette ligne dans ton fichier .env :")
print(f"ADMIN_PASSWORD_HASH={hashed}")
