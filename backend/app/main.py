from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, generate, user
from app.services.redis import close_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
    await close_redis()


app = FastAPI(
    title="小红书爆款文案生成器 API",
    description="AI-powered copywriting generator for Xiaohongshu",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://lingxinote.top", "http://www.lingxinote.top", "http://47.86.227.167"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(generate.router)
app.include_router(user.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
