import json
from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.models.user import User
from app.models.generation import Generation
from app.schemas.generate import GenerateRequest
from app.middleware import get_current_user
from app.services.ai_service import (
    generate_titles,
    generate_opening,
    generate_deai,
    generate_emoji,
    generate_zhongcao,
)

router = APIRouter(prefix="/api", tags=["generate"])


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

    text = body.text.strip()
    if not text or len(text) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text must be at least 5 characters",
        )

    async def event_generator():
        # Step 1: Generate titles
        yield {"event": "status", "data": "正在生成爆款标题..."}
        titles = await generate_titles(text)
        yield {"event": "titles", "data": titles}

        # Step 2: Generate opening
        yield {"event": "status", "data": "正在创作情绪化开头..."}
        opening = await generate_opening(text)
        yield {"event": "opening", "data": opening}

        # Step 3: De-AI
        yield {"event": "status", "data": "正在去 AI 味..."}
        deai = await generate_deai(text)
        yield {"event": "deai", "data": deai}

        # Step 4: Add emoji
        yield {"event": "status", "data": "正在加入 emoji..."}
        emoji = await generate_emoji(text)
        yield {"event": "emoji", "data": emoji}

        # Step 5: Zhongcao style
        yield {"event": "status", "data": "正在转换为种草风格..."}
        zhongcao = await generate_zhongcao(text)
        yield {"event": "zhongcao", "data": zhongcao}

        # Save to database
        gen = Generation(
            user_id=current_user.id,
            original_text=text,
            titles=titles,
            opening=opening,
            deai_result=deai,
            emoji_result=emoji,
            zhongcao_result=zhongcao,
        )
        db.add(gen)
        db.commit()

        yield {"event": "done", "data": json.dumps({"generation_id": gen.id})}

    return EventSourceResponse(event_generator())
