from fastapi import APIRouter, Depends
from app.core.security import get_current_admin
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/test")
def admin_test(current_admin: User = Depends(get_current_admin)):
    return {
        "message": "Admin access granted",
        "admin_email": current_admin.email,
    }
