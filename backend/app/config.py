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
    # 业务时区偏移（小时）。每日额度按这个时区的 00:00 重置。
    # 8 = 北京时间（UTC+8）。服务器在哪个时区都不影响这个口径。
    business_timezone_offset: int = 8

    # SMS — PNVS (阿里云个人开发者验证码服务)
    # sms_enabled=true 时使用 PNVS SendSmsVerifyCode API 发送真实验证码
    # false 时使用固定码 000000（开发模式，任何手机号都能登进来，切勿在生产开启）
    sms_enabled: bool = False
    sms_access_key: str = ""
    sms_secret_key: str = ""
    # 签名名称和模板 Code 都是**必填**，用控制台赠送的那一套
    # （赠送签名必须搭配赠送模板；登录/注册模板 Code 为 100001）
    # 查看位置：号码认证服务控制台 → 短信认证参数配置 → 签名配置/模板配置 → 赠送
    sms_sign_name: str = ""
    sms_template_code: str = "100001"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
