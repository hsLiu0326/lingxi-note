from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.generation import Generation
from app.schemas.generate import HistoryListResponse, HistoryResponse
from app.schemas.user import UsageResponse
from app.middleware import get_current_user

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/history", response_model=HistoryListResponse)
def get_history(
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Generation)
        .filter(Generation.user_id == current_user.id)
        .order_by(Generation.created_at.desc())
    )
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            HistoryResponse(
                id=gen.id,
                original_text=gen.original_text,
                titles=gen.titles,
                opening=gen.opening,
                deai_result=gen.deai_result,
                emoji_result=gen.emoji_result,
                zhongcao_result=gen.zhongcao_result,
                created_at=gen.created_at.isoformat(),
            )
            for gen in items
        ],
        "total": total,
    }


@router.get("/usage", response_model=UsageResponse)
def get_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    used_today = (
        db.query(Generation)
        .filter(
            Generation.user_id == current_user.id,
            Generation.created_at >= today_start,
        )
        .count()
    )
    limit = current_user.effective_daily_limit()
    return UsageResponse(
        used_today=used_today,
        daily_limit=limit,
        remaining=max(0, limit - used_today),
    )
