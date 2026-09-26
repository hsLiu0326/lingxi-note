"""每日生成额度的统计口径。

为什么单独抽一个模块
--------------------
`generations.created_at` 存的是 **UTC 的 naive datetime**
（见 models/generation.py），但「今天用了多少次」是给用户看的，
必须按**用户所在时区**来划分"一天"。

旧实现是这么写的::

    today_start = datetime.combine(date.today(), datetime.min.time()) \\
        .replace(tzinfo=timezone.utc)

`date.today()` 取的是服务器本地日期（北京），却又被贴上了 UTC 的时区，
等于把「北京时间的今天 0 点」当成了「UTC 的今天 0 点」，
统计窗口实际从北京时间**早上 8 点**才开始。后果：

- 北京时间 00:00 — 08:00 之间，窗口还没开始，计数恒为 0，
  免费额度形同失效；
- 额度重置时间变成早上 8 点，而不是半夜 0 点。

而且这段逻辑在 `routers/generate.py` 和 `routers/user.py` 各写了一遍，
两边一旦改岔就会出现「能生成但不扣次数」这种更难查的问题。
所以统一收敛到这里。
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.generation import Generation
from app.models.user import User


def business_timezone() -> timezone:
    """业务时区（默认 UTC+8，即北京时间）。"""
    return timezone(timedelta(hours=settings.business_timezone_offset))


def today_start_utc() -> datetime:
    """业务时区「今天 00:00」对应的 UTC naive datetime。

    返回 naive 值是刻意的：数据库列是不带时区的 DateTime，
    写入时也是直接取 UTC 的墙上时间，两边口径必须一致才能正确比较。
    """
    now_local = datetime.now(business_timezone())
    start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_local.astimezone(timezone.utc).replace(tzinfo=None)


def count_today(db: Session, user_id: int) -> int:
    """统计该用户在当前业务日已生成的次数。"""
    return (
        db.query(Generation)
        .filter(
            Generation.user_id == user_id,
            Generation.created_at >= today_start_utc(),
        )
        .count()
    )


def check_daily_limit(user: User, db: Session) -> tuple[int, int]:
    """返回 (今日已用次数, 当日上限)。"""
    return count_today(db, user.id), user.effective_daily_limit()
