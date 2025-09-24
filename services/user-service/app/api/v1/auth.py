from fastapi import APIRouter, HTTPException
from app.core.sso import sso_providers


router = APIRouter()

@router.get("/auth/{provider}/login", name="auth:login")
async def sso_login(provider: str):
    """
    Redirects the user to the provider's login page.
    """
    if provider not in sso_providers:
        raise HTTPException(status_code=404, detail="Provider not supported")

    sso_client = sso_providers[provider]
    return await sso_client.get_login_redirect()
