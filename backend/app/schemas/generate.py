from datetime import datetime

from pydantic import BaseModel, field_serializer


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
        return dt.isoformat()


class HistoryListResponse(BaseModel):
    items: list[HistoryResponse]
    total: int
