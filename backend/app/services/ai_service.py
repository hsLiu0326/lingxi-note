import os
from pathlib import Path

import httpx

from app.config import settings

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


def _load_prompt(filename: str) -> str:
    filepath = PROMPTS_DIR / filename
    if filepath.exists():
        return filepath.read_text(encoding="utf-8")
    return ""


def _prompt_template(filename: str) -> str:
    return _load_prompt(filename)


async def call_openai_stream(
    system_prompt: str,
    user_text: str,
) -> list[str]:
    """Call OpenAI chat completions with streaming, return all content chunks."""
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

    if not settings.openai_api_key:
        # Return mock data for development without API key,
        # formatted as a valid SSE chunk so the normal parser can decode it.
        import json

        mock_text = f"[模拟结果] 基于您的文案生成的{len(system_prompt)}字风格化内容"
        return [
            json.dumps(
                {"choices": [{"delta": {"content": mock_text}}]},
                ensure_ascii=False,
            )
        ]

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            f"{settings.openai_base_url}/chat/completions",
            headers=headers,
            json=payload,
        ) as response:
            response.raise_for_status()
            chunks: list[str] = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    chunks.append(data)
            return chunks


async def generate_titles(user_text: str) -> str:
    prompt = _prompt_template("titles.txt")
    if not prompt:
        prompt = """你是一位小红书爆款标题专家。请为以下文案生成 10 个吸引人的小红书标题。

要求：
1. 使用数字和符号（如 🔥、｜）
2. 制造好奇和紧迫感
3. 每行一个标题，不要编号
4. 直接输出标题列表，不要多余文字

原文：{input_text}"""
    prompt = prompt.replace("{input_text}", user_text)
    chunks = await call_openai_stream(prompt, user_text)
    return _parse_streamed_content(chunks)


async def generate_opening(user_text: str) -> str:
    prompt = _prompt_template("opening.txt")
    if not prompt:
        prompt = """你是一位小红书情绪化开头写作专家。请为以下文案写一个极具情绪感染力的开头。

要求：
1. 使用感叹、疑问、设问等句式
2. 制造共鸣和代入感
3. 80-150 字
4. 直接输出开头内容

原文：{input_text}"""
    prompt = prompt.replace("{input_text}", user_text)
    chunks = await call_openai_stream(prompt, user_text)
    return _parse_streamed_content(chunks)


async def generate_deai(user_text: str) -> str:
    prompt = _prompt_template("deai.txt")
    if not prompt:
        prompt = """你是一位去AI化文案改写专家。请将以下文案改写得更加自然、口语化，去除AI痕迹。

要求：
1. 使用口语化表达
2. 增加真实感细节
3. 避免"首先/其次/最后"等结构化词语
4. 直接输出改写结果

原文：{input_text}"""
    prompt = prompt.replace("{input_text}", user_text)
    chunks = await call_openai_stream(prompt, user_text)
    return _parse_streamed_content(chunks)


async def generate_emoji(user_text: str) -> str:
    prompt = _prompt_template("emoji.txt")
    if not prompt:
        prompt = """你是一位emoji运用专家。请为以下文案适当添加emoji，使其更生动活泼。

要求：
1. 每句话至少一个相关emoji
2. 使用🔥✨💕👏🎉等热门emoji
3. emoji要自然，不要过度
4. 直接输出加好emoji的结果

原文：{input_text}"""
    prompt = prompt.replace("{input_text}", user_text)
    chunks = await call_openai_stream(prompt, user_text)
    return _parse_streamed_content(chunks)


async def generate_zhongcao(user_text: str) -> str:
    prompt = _prompt_template("zhongcao.txt")
    if not prompt:
        prompt = """你是一位小红书种草文案专家。请将以下文案改写成小红书种草风格。

要求：
1. 开头用感叹或疑问吸引注意
2. 使用"姐妹们"/"家人们"等称呼
3. 加入个人真实体验感
4. 结尾引导互动（点赞/收藏/评论）
5. 适当使用emoji
6. 直接输出改写结果

原文：{input_text}"""
    prompt = prompt.replace("{input_text}", user_text)
    chunks = await call_openai_stream(prompt, user_text)
    return _parse_streamed_content(chunks)


def _parse_streamed_content(chunks: list[str]) -> str:
    """Parse OpenAI streamed response chunks into complete text."""
    import json

    content_parts: list[str] = []
    for chunk in chunks:
        if not chunk.strip():
            continue
        try:
            data = json.loads(chunk)
            delta = data.get("choices", [{}])[0].get("delta", {})
            if content := delta.get("content", ""):
                content_parts.append(content)
        except (json.JSONDecodeError, KeyError, IndexError):
            continue
    return "".join(content_parts)
