"""每日生成额度：统计口径 + 占用生命周期。

时间口径
--------
`generations.created_at` 存的是 **UTC 的 naive datetime**，但「今天用了多少次」
是给用户看的，必须按**用户所在时区**划分"一天"。

旧实现写成::

    today_start = datetime.combine(date.today(), datetime.min.time()) \\
        .replace(tzinfo=timezone.utc)

`date.today()` 取的是服务器本地日期（北京），却又被贴上 UTC 时区，等于把
「北京时间的今天 0 点」当成了「UTC 的今天 0 点」，统计窗口实际从北京时间
**早上 8 点**才开始。后果：00:00-08:00 之间计数恒为 0（免费额度形同失效），
且额度重置时间变成早上 8 点。现在统一按业务时区（默认 UTC+8）计算。

额度占用为什么要「先占坑」
--------------------------
旧实现是「生成成功才写库，写库才算一次」，于是有两个漏洞：

1. 生成到一半关掉页面 → 不写库 → 不扣次数，可以无限白嫖；
2. 同时开多个标签页点生成 → 都在「还没用完」的时刻通过检查。

现在改成：请求一开始就先写一条**占位记录**（内容列全为空）把额度占住。

- 5 项任务全部失败 → 删掉占位记录，额度退还；
- 中途断开 → 占位记录保留，**额度照扣**（这正是要堵的漏洞），
  同时把已经收到的内容落库，避免历史记录里留下空白条目；
- 后端崩溃留下的过期空记录 → 由 purge_stale_reservations 清理，
  并且在统计时也不会被计入。
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.generation import Generation
from app.models.user import User

# 任务名 → generations 表的字段名
TASK_COLUMNS: dict[str, str] = {
    "titles": "titles",
    "opening": "opening",
    "deai": "deai_result",
    "emoji": "emoji_result",
    "zhongcao": "zhongcao_result",
}

# 占位记录的有效期（秒）。正常生成只需几秒到几十秒，
# 超过这个时间还没写入任何内容，就认为是被遗弃的（例如后端崩溃）。
RESERVATION_TTL_SECONDS = 900


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


def _reservation_expiry() -> datetime:
    """早于这个时间的空记录视为已遗弃。"""
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    return now_utc - timedelta(seconds=RESERVATION_TTL_SECONDS)


def _has_content() -> list:
    """「这条记录已经有内容」的判定条件。"""
    return [getattr(Generation, col).isnot(None) for col in TASK_COLUMNS.values()]


def count_today(db: Session, user_id: int) -> int:
    """统计该用户在当前业务日已占用的次数。

    包含「正在进行中」的占位记录（否则并发请求会同时挤过检查），
    但不含已经过期且没有任何内容的遗弃记录。
    """
    return (
        db.query(Generation)
        .filter(
            Generation.user_id == user_id,
            Generation.created_at >= today_start_utc(),
            or_(*_has_content(), Generation.created_at >= _reservation_expiry()),
        )
        .count()
    )


def purge_stale_reservations(db: Session, user_id: int) -> int:
    """删除早已过期、且没有任何内容的占位记录。返回删除条数。"""
    return (
        db.query(Generation)
        .filter(
            Generation.user_id == user_id,
            Generation.created_at < _reservation_expiry(),
            *[getattr(Generation, col).is_(None) for col in TASK_COLUMNS.values()],
        )
        .delete(synchronize_session=False)
    )


def try_reserve(db: Session, user_id: int, text: str, limit: int) -> int | None:
    """占用一次额度。

    先写占位记录、再回过头数数，这样两个并发请求不会同时挤过检查
    （后到的那条会把自己刚写的记录删掉并返回 None）。

    返回占位记录 id；额度已满返回 None。
    """
    purge_stale_reservations(db, user_id)

    gen = Generation(user_id=user_id, original_text=text)
    db.add(gen)
    db.commit()
    db.refresh(gen)

    if count_today(db, user_id) > limit:
        db.delete(gen)
        db.commit()
        return None
    return gen.id


def release_reservation(gen_id: int) -> None:
    """退还额度：删掉占位记录。用于「一项都没成功」的情况。"""
    db = SessionLocal()
    try:
        db.query(Generation).filter(Generation.id == gen_id).delete(
            synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


def finalize_reservation(gen_id: int, contents: dict[str, str]) -> None:
    """把生成的内容写入占位记录，额度正式消耗掉。"""
    db = SessionLocal()
    try:
        gen = db.get(Generation, gen_id)
        if gen is None:
            return
        for task, column in TASK_COLUMNS.items():
            setattr(gen, column, contents.get(task) or None)
        db.commit()
    finally:
        db.close()
