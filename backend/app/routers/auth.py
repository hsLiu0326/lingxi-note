from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserRegister,
    UserLogin,
    PhoneSendCodeRequest,
    PhoneLoginRequest,
    ChangePasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.middleware import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    normalize_email,
    is_valid_email,
    validate_password,
)
from app.config import settings

from app.services.redis import redis_setex, redis_get, redis_delete

router = APIRouter(prefix="/api/auth", tags=["auth"])

CODE_TTL = 300  # seconds

# ── Email password register ──────────────────────────────────────────


@router.post("/register", response_model=TokenResponse)
def register(body: UserRegister, db: Session = Depends(get_db)):
    email = normalize_email(body.email)
    username = body.username.strip()
    password = body.password

    if not is_valid_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱格式不正确",
        )
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名不能为空",
        )
    pwd_error = validate_password(password)
    if pwd_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pwd_error,
        )

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已注册",
        )
    user = User(
        email=email,
        username=username,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


# ── Email password login ─────────────────────────────────────────────


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == normalize_email(body.email)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号不存在",
        )
    if not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="密码错误",
        )
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


# ── Phone verification code (Redis) ──────────────────────────────────


@router.post("/phone/send-code")
async def send_phone_code(body: PhoneSendCodeRequest):
    """Send SMS verification code to phone number.

    When ``SMS_ENABLED=false`` (default), the code is always ``000000``
    for local development.

    When ``SMS_ENABLED=true``, the code is sent via Aliyun PNVS
    (personal developer verification code service).
    """
    phone = body.phone.strip()
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number required"
        )

    if settings.sms_enabled:
        from app.services.sms import send_verify_code

        try:
            code = await send_verify_code(phone)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"短信发送失败: {e}",
            )
    else:
        code = "000000"
        print(f"\n[SMS CODE] Phone: {phone}  Code: {code}  (expires in {CODE_TTL}s)\n")

    await redis_setex(f"phone_code:{phone}", CODE_TTL, code)

    return {"message": "Code sent", "expires_in": CODE_TTL}


# ── Phone code login / register ──────────────────────────────────────


@router.post("/phone/login", response_model=TokenResponse)
async def phone_login(body: PhoneLoginRequest, db: Session = Depends(get_db)):
    phone = body.phone.strip()
    code = body.code.strip()

    stored = await redis_get(f"phone_code:{phone}")
    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No code sent to this number or code expired",
        )

    if stored != code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    await redis_delete(f"phone_code:{phone}")

    # Find or create user
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            phone_verified=True,
            username=phone,  # temporary, can change later
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


# ── Change password ──────────────────────────────────────────────────


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该账号是手机号注册的，尚未设置密码",
        )
    if not verify_password(body.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码错误",
        )
    pwd_error = validate_password(body.new_password)
    if pwd_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pwd_error,
        )
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "密码修改成功"}


# ── Get current user ─────────────────────────────────────────────────


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
