from datetime import datetime

from pydantic import BaseModel, field_serializer

from app.schemas.generate import to_iso_utc


class UserRegister(BaseModel):
    email: str
    username: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class PhoneSendCodeRequest(BaseModel):
    phone: str


class PhoneLoginRequest(BaseModel):
    phone: str
    code: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str | None
    phone: str | None
    username: str
    avatar_url: str | None
    is_premium: bool
    daily_limit: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        return to_iso_utc(dt)


class UsageResponse(BaseModel):
    used_today: int
    daily_limit: int
    remaining: int
