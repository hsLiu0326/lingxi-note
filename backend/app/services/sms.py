"""Aliyun PNVS (号码认证服务) SMS verification code service.
"""

import json
import random
from typing import Optional

from app.config import settings


def _build_client():
    """Lazy-import the SDK and create a client."""
    from alibabacloud_dypnsapi20170525.client import Client as DypnsapiClient
    from alibabacloud_tea_openapi import models as open_api_models

    config = open_api_models.Config(
        access_key_id=settings.sms_access_key,
        access_key_secret=settings.sms_secret_key,
    )
    config.endpoint = "dypnsapi.aliyuncs.com"
    return DypnsapiClient(config)


async def send_verify_code(phone: str) -> str:
    """Send a verification code via PNVS and return the code string."""
    from alibabacloud_dypnsapi20170525 import models as dypnsapi_models
    from alibabacloud_tea_util import models as util_models

    code = str(random.randint(100000, 999999))

    client = _build_client()

    req = dypnsapi_models.SendSmsVerifyCodeRequest(
        phone_number=phone,
        sign_name=settings.sms_sign_name or None,
        template_code=settings.sms_template_code or None,
        template_param=json.dumps({"code": code, "min": "5"}),
        code_length=6,
        valid_time=5,
    )

    runtime = util_models.RuntimeOptions()
    resp = await client.send_sms_verify_code_with_options_async(req, runtime)

    body = resp.body
    if body.code != "OK" or not body.success:
        msg = body.message or "unknown error"
        raise RuntimeError(f"PNVS send failed: {msg}")

    return code
