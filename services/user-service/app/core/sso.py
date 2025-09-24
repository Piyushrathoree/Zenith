from fastapi_sso.sso.google import GoogleSSO
from fastapi_sso.sso.github import GithubSSO
from app.core.config import settings

BASE_URL_CALLBACK = "http://localhost:8001/api/v1/auth/{provider}/callback"

google_sso = GoogleSSO(
    settings.GOOGLE_CLIENT_ID,
    settings.GOOGLE_CLIENT_SECRET,
    BASE_URL_CALLBACK.format(provider="google"),
    allow_insecure_http=True # needs to be false in production
)

github_sso = GithubSSO(
    settings.GITHUB_CLIENT_ID,
    settings.GITHUB_CLIENT_SECRET,
    BASE_URL_CALLBACK.format(provider='github'),
    allow_insecure_http=True # needs to be false in prodcution
)

sso_providers = {
    "github":github_sso,
    "google":google_sso
}