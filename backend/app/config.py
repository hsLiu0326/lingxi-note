from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./xhs.db"

    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # OpenAI
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    frontend_url: str = "http://localhost:3000"

    # App limits
    daily_free_limit: int = 3
    premium_daily_limit: int = 999

    # SMS — PNVS (阿里云个人开发者验证码服务)
    # sms_enabled=true 时使用 PNVS SendSmsVerifyCode API 发送真实验证码
    # false 时使用固定码 000000（开发模式）
    sms_enabled: bool = False
    sms_access_key: str = ""
    sms_secret_key: str = ""
    # PNVS 个人开发者不需要自定义签名和模板，留空即可
    # 如果配置了值，会作为参数传给 API
    sms_sign_name: str = ""
    sms_template_code: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
