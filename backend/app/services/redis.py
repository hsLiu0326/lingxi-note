import asyncio
from collections import OrderedDict

from app.config import settings

_redis = None
_fallback: dict[str, str] = {}
_fallback_expiry: dict[str, float] = {}
_lock: asyncio.Lock | None = None


async def _try_connect() -> bool:
    try:
        import redis.asyncio as aioredis

        r = aioredis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2)
        await r.ping()
        global _redis
        _redis = r
        return True
    except Exception:
        return False


async def get_redis():
    global _redis, _lock
    if _lock is None:
        _lock = asyncio.Lock()
    async with _lock:
        if _redis is None:
            ok = await _try_connect()
            if not ok:
                print("[Redis] Not available — using in-memory fallback")
            return _redis  # may be None
    return _redis


async def _fallback_setex(key: str, ttl: int, value: str):
    _fallback[key] = value
    _fallback_expiry[key] = asyncio.get_event_loop().time() + ttl
    # clean expired
    now = asyncio.get_event_loop().time()
    expired = [k for k, v in _fallback_expiry.items() if v < now]
    for k in expired:
        _fallback.pop(k, None)
        _fallback_expiry.pop(k, None)


async def _fallback_get(key: str) -> str | None:
    now = asyncio.get_event_loop().time()
    expiry = _fallback_expiry.get(key)
    if expiry is None or now > expiry:
        _fallback.pop(key, None)
        _fallback_expiry.pop(key, None)
        return None
    return _fallback.get(key)


async def redis_setex(key: str, ttl: int, value: str):
    r = await get_redis()
    if r:
        await r.setex(key, ttl, value)
    else:
        await _fallback_setex(key, ttl, value)


async def redis_get(key: str) -> str | None:
    r = await get_redis()
    if r:
        return await r.get(key)
    return await _fallback_get(key)


async def redis_delete(key: str):
    r = await get_redis()
    if r:
        await r.delete(key)
    else:
        _fallback.pop(key, None)
        _fallback_expiry.pop(key, None)


async def close_redis():
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
