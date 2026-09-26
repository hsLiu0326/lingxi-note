"""文案生成路由：5 个任务并行执行，并以 SSE 把每个字实时推给前端。

额度模型
--------
请求进来先写一条**占位记录**把当日额度占住（详见 services/quota.py）：

- 5 项任务全部失败 → 删掉占位记录，额度退还，前端收到 error 事件；
- 中途断开／关页面 → 占位记录保留，额度照扣（堵住白嫖），
  并把已经收到的内容落库，历史记录里不会留下空白条目。

SSE 事件协议（v2）
------------------
status      纯文本，通用状态提示
chunk       JSON {"task": "...", "text": "..."}   —— 某个任务的一个文本分片
task_done   JSON {"task": "..."}                  —— 某个任务生成完毕
task_error  JSON {"task": "...", "message": "..."} —— 某个任务失败
done        JSON {"generation_id": N}             —— 全部结束且已入库
error       纯文本，全部任务失败（已退还额度）
"""

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.models.user import User
from app.schemas.generate import GenerateRequest
from app.middleware import get_current_user
from app.services.ai_service import TASK_KEYS, TASK_TIMEOUT, stream_task
from app.services.quota import (
    finalize_reservation,
    release_reservation,
    try_reserve,
)

router = APIRouter(prefix="/api", tags=["generate"])


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


async def _pump(
    task: str, user_text: str, queue: asyncio.Queue, collected: dict[str, list[str]]
):
    """把单个任务的分片边收边塞进队列，同时留存一份用于中途断开时落库。"""
    async for chunk in stream_task(task, user_text):
        collected[task].append(chunk)
        await queue.put({"type": "chunk", "task": task, "text": chunk})


async def _run_task(
    task: str, user_text: str, queue: asyncio.Queue, collected: dict[str, list[str]]
) -> tuple[str, bool]:
    """跑完单个任务。返回 (任务名, 是否成功)。"""
    ok = False
    try:
        await asyncio.wait_for(
            _pump(task, user_text, queue, collected), timeout=TASK_TIMEOUT
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
    return task, ok


@router.post("/generate")
async def generate(
    body: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_text = body.text.strip()
    if not user_text or len(user_text) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text must be at least 5 characters",
        )

    limit = current_user.effective_daily_limit()
    gen_id = try_reserve(db, current_user.id, user_text, limit)
    if gen_id is None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily limit ({limit}) reached. Upgrade to premium for unlimited access.",
        )

    async def event_generator():
        queue: asyncio.Queue[dict] = asyncio.Queue()
        collected: dict[str, list[str]] = {task: [] for task in TASK_KEYS}
        tasks = [
            asyncio.create_task(_run_task(task, user_text, queue, collected))
            for task in TASK_KEYS
        ]
        persisted = False

        def persist() -> bool:
            """把已收到的内容写入占位记录。一项内容都没有则退还额度。"""
            contents = {task: "".join(collected[task]) for task in TASK_KEYS}
            if not any(contents.values()):
                release_reservation(gen_id)
                return False
            finalize_reservation(gen_id, contents)
            return True

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

            await asyncio.gather(*tasks, return_exceptions=True)

            persisted = persist()
            if persisted:
                yield {
                    "event": "done",
                    "data": json.dumps(
                        {"generation_id": gen_id}, ensure_ascii=False
                    ),
                }
            else:
                yield {
                    "event": "error",
                    "data": "全部生成任务都失败了，本次不消耗额度",
                }
        finally:
            # 客户端中途断开时上面的 persist() 不会执行，但额度必须扣掉 ——
            # 这正是要堵的漏洞。同时把已经收到的内容落库，
            # 避免历史记录里留下一张空白卡片。
            if not persisted:
                try:
                    persist()
                except Exception:  # noqa: BLE001 — 收尾失败不应掩盖原始异常
                    pass

            for task in tasks:
                if not task.done():
                    task.cancel()
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except Exception:  # noqa: BLE001 — 收尾阶段的异常不应影响已扣的额度
                pass

    return EventSourceResponse(
        event_generator(),
        # 关掉中间层缓冲，否则 Nginx 会把流式响应攒成一大块再发，前端就看不到打字机效果
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
