from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def create_admin():
    db = SessionLocal()

    email = "admin@sterve.com"
    password = "Admin123!"

    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        print("⚠️ Admin déjà existant.")
        return

    new_user = User(
        email=email,
        hashed_password=hash_password(password),
        is_active=True,
        is_admin=True
    )

    db.add(new_user)
    db.commit()
    db.close()

    print("✅ Admin créé avec succès.")
    print(f"Email: {email}")
    print(f"Password: {password}")


if __name__ == "__main__":
    create_admin()
