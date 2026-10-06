"""阿里云 PNVS（号码认证服务）短信认证 —— 发送短信验证码。

个人开发者专用通道
------------------
普通阿里云短信服务（dysmsapi）需要企业资质，个人办不下来。
PNVS 的「短信认证」支持个人实名账号直接调用，**无需申请签名和模板**，
用控制台赠送的即可。

两个必填参数（容易踩坑）
------------------------
`SignName`（签名名称）和 `TemplateCode`（模板 Code）都是**必填**的，
必须使用控制台赠送的那一套，且**赠送签名必须搭配赠送模板**使用。
（早期版本注释写着"留空即可"，是错的，会导致调用直接失败。）

赠送模板里，登录/注册场景对应的是 `100001`。

为什么只传 4 个参数
-------------------
`CodeLength` / `ValidTime` 是「让系统自己生成验证码」时用的。
我们走的是「自己生成验证码 + 存 Redis 自己校验」的路线
（这样能复用现有的手机验证码登录流程），因此必须通过
`TemplateParam` 把验证码传给模板，此时**不能再传 CodeLength/ValidTime**，
否则两套机制冲突，接口会返回 UNKNOWN 之类的失败。
"""

import json
import random

from app.config import settings

# 赠送模板中「登录/注册」对应的模板 Code
TEMPLATE_LOGIN = "100001"
# 验证码有效期（分钟），会作为模板变量 min 传给短信内容
CODE_VALID_MINUTES = 5


def _build_client():
    """延迟导入 SDK 并创建客户端（SDK 较重，避免拖慢启动）。"""
    from alibabacloud_dypnsapi20170525.client import Client as DypnsapiClient
    from alibabacloud_tea_openapi import models as open_api_models

    if not settings.sms_access_key or not settings.sms_secret_key:
        raise RuntimeError("未配置 SMS_ACCESS_KEY / SMS_SECRET_KEY，无法发送短信")

    config = open_api_models.Config(
        access_key_id=settings.sms_access_key,
        access_key_secret=settings.sms_secret_key,
    )
    config.endpoint = "dypnsapi.aliyuncs.com"
    return DypnsapiClient(config)


def _require_sign_and_template() -> tuple[str, str]:
    """取出签名和模板，缺失时给出明确的报错。"""
    sign = (settings.sms_sign_name or "").strip()
    template = (settings.sms_template_code or "").strip() or TEMPLATE_LOGIN
    if not sign:
        raise RuntimeError(
            "未配置 SMS_SIGN_NAME（签名名称）。"
            "请在号码认证服务控制台 → 短信认证参数配置 → 签名配置 → 赠送签名配置 中查看"
        )
    return sign, template


# 阿里云返回码 → 人话。方便直接判断该去控制台改什么。
_CODE_TIPS = {
    "UNKNOWN": (
        "阿里云返回未知错误。常见原因：控制台未开启「短信认证」功能开关，"
        "或套餐包余量/账户余额不足"
    ),
    "biz.FREQUENCY": "发送过于频繁，请稍后再试",
    "isv.INVALID_PARAMETERS": "签名或模板无效，请核对控制台赠送的签名与模板",
    "isv.AMOUNT_NOT_ENOUGH": "账户余额或套餐包不足",
    "isv.ACCOUNT_ABNORMAL": "账户状态异常",
    "isp.RAM_PERMISSION_DENY": "当前 AccessKey 没有发送短信的权限",
    "isv.MOBILE_NUMBER_ILLEGAL": "手机号格式不正确",
}


async def send_verify_code(phone: str) -> str:
    """给指定手机号发送验证码，返回生成的验证码字符串。"""
    from alibabacloud_dypnsapi20170525 import models as dypnsapi_models
    from alibabacloud_tea_util import models as util_models

    sign_name, template_code = _require_sign_and_template()
    code = str(random.randint(100000, 999999))

    client = _build_client()

    req = dypnsapi_models.SendSmsVerifyCodeRequest(
        phone_number=phone,
        sign_name=sign_name,
        template_code=template_code,
        # 只传这 4 个参数：把验证码通过模板变量交给短信内容
        template_param=json.dumps(
            {"code": code, "min": str(CODE_VALID_MINUTES)}
        ),
    )

    resp = await client.send_sms_verify_code_with_options_async(
        req, util_models.RuntimeOptions()
    )

    body = resp.body
    if body.code != "OK" or not body.success:
        raw = f"{body.code} / {body.message}"
        tip = _CODE_TIPS.get(body.code or "", "")
        raise RuntimeError(f"{tip}（阿里云返回：{raw}）" if tip else raw)

    return code
