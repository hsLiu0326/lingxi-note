from datetime import datetime, timezone

from sqlalchemy import Integer, String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.config import settings


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    phone: Mapped[str | None] = mapped_column(
        String(20), unique=True, index=True, nullable=True
    )
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    username: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    oauth_provider: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    oauth_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    daily_limit: Mapped[int] = mapped_column(
        Integer, default=lambda: settings.daily_free_limit
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    def effective_daily_limit(self) -> int:
        """用户当日生成上限：付费用户取配置值，免费用户取个人字段值。"""
        if self.is_premium:
            return settings.premium_daily_limit
        return self.daily_limit
