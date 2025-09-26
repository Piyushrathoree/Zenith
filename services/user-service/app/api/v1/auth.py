from fastapi import APIRouter, HTTPException, status
from app.core.sso import sso_providers
from app.core.security import get_hash_password
from ...schemas.user import User as schema
from ...db.model import User


router = APIRouter()


@router.get("/auth/{provider}/login", name="auth:login")
async def sso_login(provider: str):
    """  Redirects the user to the provider's login page.  """
    if provider not in sso_providers:
        raise HTTPException(status_code=404, detail="Provider not supported")

    sso_client = sso_providers[provider]
    return await sso_client.get_login_redirect()


@router.post("/auth/register", name="auth:register")
async def register(user: schema):
    """auth route for register user through jwt"""

    existing_user = await User.find_one(User.email == user.email)
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    hashed_password = get_hash_password(user.password)

    if not user.avatar_url:
        user.avatar_url = ""
    
    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        avatar_url=user.avatar_url,
    )
    await new_user.save()

    return {"user": new_user, "message": "user created successfully", "success": "True"}

@router.post("/auth/login",name="auth:login")
async def login()