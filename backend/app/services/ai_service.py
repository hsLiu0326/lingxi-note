"""AI 服务：调用 DeepSeek（OpenAI 兼容接口），并以「边收边吐」的方式流式产出。

与旧版的区别
------------
旧版 ``call_openai_stream`` 会把 AI 返回的所有分片先攒进一个 list，
等整段生成完再一次性返回，所以用户看到的是「卡住几秒 → 整段蹦出来」。
新版统一改为 async generator：上游每吐一个分片就立刻 yield 出去，
配合 routers/generate.py 里的 asyncio.Queue 汇聚，
5 个任务可以同时开跑，并且每个字都实时推到前端。
"""

import asyncio
import json
from collections.abc import AsyncIterator
from pathlib import Path

import httpx

from app.config import settings

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"

# 单个任务的整体超时（秒）。防止上游挂住导致整条 SSE 连接永远不结束。
TASK_TIMEOUT = 180.0

# ── 5 个任务的定义：任务名 → (prompt 文件名, 兜底 prompt) ──────────────
# prompt 模板支持 {input_text} 占位符；txt 文件读不到时用兜底内容。

_FALLBACK_TITLES = """你是一位小红书爆款标题专家。请为以下文案生成 10 个吸引人的小红书标题。

要求：
1. 使用数字和符号（如 🔥、｜）
2. 制造好奇和紧迫感
3. 每行一个标题，不要编号
4. 直接输出标题列表，不要多余文字

原文：{input_text}"""

_FALLBACK_OPENING = """你是一位小红书情绪化开头写作专家。请为以下文案写一个极具情绪感染力的开头。

要求：
1. 使用感叹、疑问、设问等句式
2. 制造共鸣和代入感
3. 80-150 字
4. 直接输出开头内容

原文：{input_text}"""

_FALLBACK_DEAI = """你是一位去AI化文案改写专家。请将以下文案改写得更加自然、口语化，去除AI痕迹。

要求：
1. 使用口语化表达
2. 增加真实感细节
3. 避免"首先/其次/最后"等结构化词语
4. 直接输出改写结果

原文：{input_text}"""

_FALLBACK_EMOJI = """你是一位emoji运用专家。请为以下文案适当添加emoji，使其更生动活泼。

要求：
1. 每句话至少一个相关emoji
2. 使用🔥✨💕👏🎉等热门emoji
3. emoji要自然，不要过度
4. 直接输出加好emoji的结果

原文：{input_text}"""

_FALLBACK_ZHONGCAO = """你是一位小红书种草文案专家。请将以下文案改写成小红书种草风格。

要求：
1. 开头用感叹或疑问吸引注意
2. 使用"姐妹们"/"家人们"等称呼
3. 加入个人真实体验感
4. 结尾引导互动（点赞/收藏/评论）
5. 适当使用emoji
6. 直接输出改写结果

原文：{input_text}"""

TASK_SPECS: dict[str, tuple[str, str]] = {
    "titles": ("titles.txt", _FALLBACK_TITLES),
    "opening": ("opening.txt", _FALLBACK_OPENING),
    "deai": ("deai.txt", _FALLBACK_DEAI),
    "emoji": ("emoji.txt", _FALLBACK_EMOJI),
    "zhongcao": ("zhongcao.txt", _FALLBACK_ZHONGCAO),
}

# 保持稳定顺序，前端算进度时用得上
TASK_KEYS: tuple[str, ...] = ("titles", "opening", "deai", "emoji", "zhongcao")


def _load_prompt(filename: str) -> str:
    filepath = PROMPTS_DIR / filename
    if filepath.exists():
        return filepath.read_text(encoding="utf-8")
    return ""


def build_prompt(task: str, user_text: str) -> str:
    """取该任务的 prompt 模板并填入用户原文。"""
    filename, fallback = TASK_SPECS[task]
    template = _load_prompt(filename) or fallback
    return template.replace("{input_text}", user_text)


async def stream_completion(
    system_prompt: str,
    user_text: str,
    task: str = "unknown",
) -> AsyncIterator[str]:
    """流式调用 OpenAI 兼容接口，上游每来一个分片就 yield 一次。"""
    # 没配 API Key 时走模拟模式，方便本地联调（也是分片吐出，能看到打字机效果）
    if not settings.openai_api_key:
        mock_text = (
            f"[模拟输出] 未配置 OPENAI_API_KEY，这是 {task} 任务的占位内容。"
            "配置真实 Key 后这里会变成 AI 生成的文案。"
        )
        for i in range(0, len(mock_text), 3):
            yield mock_text[i : i + 3]
            await asyncio.sleep(0.03)
        return

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.openai_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
        ],
        "stream": True,
        "temperature": 0.8,
        "max_tokens": 2048,
    }

    timeout = httpx.Timeout(60.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream(
            "POST",
            f"{settings.openai_base_url}/chat/completions",
            headers=headers,
            json=payload,
        ) as response:
            if response.status_code >= 400:
                body = (await response.aread()).decode("utf-8", "ignore")
                raise RuntimeError(
                    f"AI 接口返回 {response.status_code}：{body[:200]}"
                )

            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if data == "[DONE]":
                    break
                if not data:
                    continue
                try:
                    obj = json.loads(data)
                except json.JSONDecodeError:
                    continue

                choices = obj.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta") or {}
                content = delta.get("content")
                if content:
                    yield content


async def stream_task(task: str, user_text: str) -> AsyncIterator[str]:
    """执行单个任务，流式产出该任务的全部文本分片。"""
    prompt = build_prompt(task, user_text)
    async for chunk in stream_completion(prompt, user_text, task=task):
        yield chunk
