from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db.session import init_db
from app.api.v1 import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    print("---- mongodb disconnected ----")


app = FastAPI(title="User Service", lifespan=lifespan)

app.include_router(
    auth.router,
    prefix="/api/v1",
    tags=["Authentication"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "user-service"}
