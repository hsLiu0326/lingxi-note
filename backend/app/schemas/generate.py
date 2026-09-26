from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer


def to_iso_utc(dt: datetime) -> str:
    """把数据库里的 naive-UTC 时间补上时区标记后再序列化。

    数据库存的是不带时区的 UTC 时间。若直接 ``isoformat()``，
    前端 ``new Date(...)`` 会按浏览器本地时区解析，
    历史记录的时间会整体差 8 小时。
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


class GenerateRequest(BaseModel):
    text: str


class HistoryResponse(BaseModel):
    id: int
    original_text: str
    titles: str | None
    opening: str | None
    deai_result: str | None
    emoji_result: str | None
    zhongcao_result: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        return to_iso_utc(dt)


class HistoryListResponse(BaseModel):
    items: list[HistoryResponse]
    total: int
