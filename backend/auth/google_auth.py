"""
auth/google_auth.py - Google OAuth2 id_token 驗證
"""
import logging
from fastapi import HTTPException, Header, Query
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def verify_google_token(
    authorization: str = Header(default=None),
    dev_uid: str = Query(default=None),
) -> str:
    """
    驗證 Google OAuth2 id_token，返回使用者的唯一 UID。

    開發模式：若 GOOGLE_CLIENT_ID 為空，允許透過 ?dev_uid=xxx 繞過驗證。
    生產模式：必須在 Authorization Header 中傳入 'Bearer <id_token>'。
    """
    # ── 開發模式 (GOOGLE_CLIENT_ID 未設定) ──────────────────────────────────
    if not settings.google_client_id:
        if dev_uid:
            logger.info(f"[Auth] 🔧 開發模式 - 使用 dev_uid: {dev_uid}")
            return dev_uid
        # 沒有 dev_uid 也允許匿名測試 (模擬 uid)
        fallback_uid = "dev_anonymous"
        logger.warning(f"[Auth] ⚠️  開發模式 - 無 dev_uid，使用預設: {fallback_uid}")
        return fallback_uid

    # ── 生產模式：驗證 id_token ─────────────────────────────────────────────
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少 Authorization Bearer token")

    token = authorization.split("Bearer ")[1].strip()

    try:
        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.google_client_id,
        )
        uid: str = id_info["sub"]
        logger.info(f"[Auth] ✅ 成功解析 UID: {uid}")
        return uid

    except ValueError as e:
        logger.error(f"[Auth] ❌ Token 驗證失敗: {e}")
        raise HTTPException(status_code=401, detail=f"Token 驗證失敗: {str(e)}")
