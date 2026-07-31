from datetime import datetime, timezone

from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Generation(Base):
    __tablename__ = "generations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    original_text: Mapped[str] = mapped_column(Text)
    titles: Mapped[str | None] = mapped_column(Text, nullable=True)
    opening: Mapped[str | None] = mapped_column(Text, nullable=True)
    deai_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    emoji_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    zhongcao_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
