from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.db.session import init_db
from app.api.v1 import auth
from app.core.security import decode_token
from jose import JWTError


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    print("---- mongodb disconnected ----")


app = FastAPI(title="User Service", lifespan=lifespan)

# Routes that don't require authentication
EXCLUDED_ROUTES = [
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/google/login",
    "/api/v1/auth/github/login",
    "/api/v1/auth/google/callback",
    "/api/v1/auth/github/callback",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json"
]

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Middleware to check authentication for protected routes"""
    # Skip authentication for excluded routes
    if request.url.path in EXCLUDED_ROUTES:
        response = await call_next(request)
        return response
    
    # Skip authentication for OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        response = await call_next(request)
        return response
    
    # Check if route needs protection (all other routes require auth)
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Authorization header missing or invalid"}
        )
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = decode_token(token)
        # Add user info to request state for use in route handlers
        request.state.user_email = payload.get("email")
        request.state.user_payload = payload
        
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": str(e)}
        )
    
    response = await call_next(request)
    return response

app.include_router(
    auth.router,
    prefix="/api/v1",
    tags=["Authentication"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "user-service"}
