"""文案生成路由：5 个任务并行执行，并以 SSE 把每个字实时推给前端。

SSE 事件协议（v2）
------------------
status      纯文本，通用状态提示
chunk       JSON {"task": "...", "text": "..."}   —— 某个任务的一个文本分片
task_done   JSON {"task": "..."}                  —— 某个任务生成完毕
task_error  JSON {"task": "...", "message": "..."} —— 某个任务失败
done        JSON {"generation_id": N}             —— 全部结束且已入库
error       纯文本，全部任务失败（此时不入库，也不消耗当日额度）
"""

import asyncio
import json
from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.generation import Generation
from app.schemas.generate import GenerateRequest
from app.middleware import get_current_user
from app.services.ai_service import TASK_KEYS, TASK_TIMEOUT, stream_task

router = APIRouter(prefix="/api", tags=["generate"])

# 任务名 → generations 表的字段名
_TASK_COLUMNS: dict[str, str] = {
    "titles": "titles",
    "opening": "opening",
    "deai": "deai_result",
    "emoji": "emoji_result",
    "zhongcao": "zhongcao_result",
}


def _check_daily_limit(user: User, db: Session) -> tuple[int, int]:
    """Check user's daily usage. Returns (used_today, daily_limit)."""
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    used = (
        db.query(Generation)
        .filter(
            Generation.user_id == user.id,
            Generation.created_at >= today_start,
        )
        .count()
    )
    limit = user.effective_daily_limit()
    return used, limit


def _friendly_error(exc: Exception) -> str:
    """把上游异常翻译成用户看得懂的一句话。"""
    msg = str(exc) or exc.__class__.__name__
    lowered = msg.lower()
    if "401" in msg or "403" in msg or "unauthorized" in lowered:
        return "AI 服务鉴权失败，请检查 API Key 配置"
    if "429" in msg:
        return "AI 服务请求过于频繁，请稍后重试"
    if "timeout" in lowered or "timed out" in lowered:
        return "AI 服务响应超时，请重试"
    return f"生成失败：{msg[:120]}"


async def _pump(task: str, user_text: str, queue: asyncio.Queue, parts: list[str]):
    """把单个任务的分片边收边塞进队列。"""
    async for chunk in stream_task(task, user_text):
        parts.append(chunk)
        await queue.put({"type": "chunk", "task": task, "text": chunk})


async def _run_task(
    task: str, user_text: str, queue: asyncio.Queue
) -> tuple[str, str, bool]:
    """跑完单个任务。返回 (任务名, 完整文本, 是否成功)。"""
    parts: list[str] = []
    ok = False
    try:
        await asyncio.wait_for(
            _pump(task, user_text, queue, parts), timeout=TASK_TIMEOUT
        )
        ok = True
    except asyncio.TimeoutError:
        await queue.put(
            {"type": "task_error", "task": task, "message": "生成超时，请重试"}
        )
    except Exception as exc:  # noqa: BLE001 — 单任务失败不应拖垮其他任务
        await queue.put(
            {
                "type": "task_error",
                "task": task,
                "message": _friendly_error(exc),
            }
        )
    else:
        await queue.put({"type": "task_done", "task": task})
    return task, "".join(parts), ok


def _save_generation(
    user_id: int, original_text: str, results: dict[str, tuple[str, bool]]
) -> int:
    """写入历史记录。用独立的 Session，避免流式响应期间依赖被回收。"""
    db = SessionLocal()
    try:
        gen = Generation(user_id=user_id, original_text=original_text)
        for task, column in _TASK_COLUMNS.items():
            body = results.get(task, ("", False))[0]
            setattr(gen, column, body or None)
        db.add(gen)
        db.commit()
        db.refresh(gen)
        return gen.id
    finally:
        db.close()


@router.post("/generate")
async def generate(
    body: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    used, limit = _check_daily_limit(current_user, db)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily limit ({limit}) reached. Upgrade to premium for unlimited access.",
        )

    user_text = body.text.strip()
    if not user_text or len(user_text) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text must be at least 5 characters",
        )

    user_id = current_user.id

    async def event_generator():
        queue: asyncio.Queue[dict] = asyncio.Queue()
        tasks = [
            asyncio.create_task(_run_task(task, user_text, queue))
            for task in TASK_KEYS
        ]

        try:
            yield {
                "event": "status",
                "data": "已同时启动 5 项生成，正在实时输出...",
            }

            pending = len(tasks)
            while pending > 0:
                item = await queue.get()
                kind = item["type"]
                if kind == "chunk":
                    yield {
                        "event": "chunk",
                        "data": json.dumps(
                            {"task": item["task"], "text": item["text"]},
                            ensure_ascii=False,
                        ),
                    }
                elif kind == "task_done":
                    pending -= 1
                    yield {
                        "event": "task_done",
                        "data": json.dumps(
                            {"task": item["task"]}, ensure_ascii=False
                        ),
                    }
                elif kind == "task_error":
                    pending -= 1
                    yield {
                        "event": "task_error",
                        "data": json.dumps(
                            {
                                "task": item["task"],
                                "message": item["message"],
                            },
                            ensure_ascii=False,
                        ),
                    }

            collected = await asyncio.gather(*tasks)
            results = {task: (text, ok) for task, text, ok in collected}

            if not any(ok for _, ok in results.values()):
                # 全部失败：不入库，相当于不消耗用户的当日额度
                yield {
                    "event": "error",
                    "data": "全部生成任务都失败了，请稍后重试",
                }
                return

            gen_id = _save_generation(user_id, user_text, results)
            yield {
                "event": "done",
                "data": json.dumps({"generation_id": gen_id}, ensure_ascii=False),
            }
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    return EventSourceResponse(
        event_generator(),
        # 关掉中间层缓冲，否则 Nginx 会把流式响应攒成一大块再发，前端就看不到打字机效果
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
