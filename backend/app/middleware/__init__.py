from datetime import datetime, timezone, timedelta

import base64
import hashlib
import re

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

security = HTTPBearer()


def _prepare(password: str) -> bytes:
    """把任意长度的密码归一化成 bcrypt 能接受的定长字节串。

    bcrypt 有个硬限制：只处理前 72 个**字节**，超出直接抛
    ValueError("password cannot be longer than 72 bytes")。
    注意单位是字节不是字符：一个汉字占 3 字节，所以密码超过 24 个汉字
    就会让注册/登录/改密码接口 500 崩溃。

    这里先做一次 SHA-256 再 base64，得到固定的 44 字节，
    于是任意长度、任意字符的密码都能正常使用，也不会再崩。
    """
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(_prepare(password), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """校验密码。任何异常都返回 False，绝不把 500 抛给用户。"""
    try:
        if _bcrypt.checkpw(_prepare(plain), hashed.encode("utf-8")):
            return True
    except (ValueError, TypeError):
        pass

    # 兼容旧数据：早期版本直接用原始密码做 bcrypt（仅前 72 字节有效）
    try:
        return _bcrypt.checkpw(
            plain.encode("utf-8")[:72], hashed.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def normalize_email(email: str) -> str:
    """邮箱统一去空格 + 转小写。

    否则用户注册时填 My@Example.com、登录时填 my@example.com，
    会被判成「账号不存在」。
    """
    return (email or "").strip().lower()


def is_valid_email(email: str) -> bool:
    """够用就好的邮箱格式校验，不做 RFC 级别的严格判断。"""
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


# ── 密码规则（产品要求：英文 / 数字 / 符号，6-12 位，不含中文与空格）──
PASSWORD_MIN_LENGTH = 6
PASSWORD_MAX_LENGTH = 12
# 可打印 ASCII 里去掉空格（0x21-0x7E）：涵盖英文字母、数字和常见符号
_PASSWORD_RE = re.compile(r"^[\x21-\x7e]+$")
PASSWORD_HINT = "密码需 6-12 位，只能包含英文、数字和符号"


def validate_password(password: str) -> str | None:
    """校验密码是否符合规则。通过返回 None，否则返回给用户看的原因。"""
    if not password:
        return "请输入密码"
    if len(password) < PASSWORD_MIN_LENGTH:
        return f"密码至少 {PASSWORD_MIN_LENGTH} 位"
    if len(password) > PASSWORD_MAX_LENGTH:
        return f"密码最多 {PASSWORD_MAX_LENGTH} 位"
    if not _PASSWORD_RE.match(password):
        return "密码只能包含英文、数字和符号（不能有中文或空格）"
    return None


# ── 手机号 ──────────────────────────────────────────────────────────
_CN_PHONE_RE = re.compile(r"^1[3-9]\d{9}$")


def is_valid_cn_phone(phone: str) -> bool:
    """中国大陆手机号格式校验。

    接口层不校验的话，用户填任何字符串都会被拿去调短信接口，
    既白白消耗调用次数，也拿不到有用的错误信息。
    """
    return bool(_CN_PHONE_RE.match((phone or "").strip()))


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
