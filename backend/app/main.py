from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://106.15.131.213",
        "http://106.15.131.213:8080",
        "http://lingxinote.top",
        "http://www.lingxinote.top",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(generate.router)
app.include_router(user.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """把参数校验错误压成一句人话。

    FastAPI 默认返回的 detail 是一个数组，前端的 ``err.detail`` 拿到的会是
    "[object Object]"。这里统一拍平成字符串，前端可以直接显示。
    """
    errors = exc.errors()
    if not errors:
        return JSONResponse(status_code=422, content={"detail": "请求参数有误"})

    first = errors[0]
    field = ".".join(
        str(part) for part in first.get("loc", ()) if part not in ("body", "query", "path")
    )
    msg = first.get("msg", "参数有误")
    detail = f"{field}: {msg}" if field else msg
    return JSONResponse(status_code=422, content={"detail": detail})


@app.get("/api/health")
def health():
    return {"status": "ok"}
