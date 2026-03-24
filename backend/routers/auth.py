"""
routers/auth.py - Google OAuth2 認證端點

POST /api/auth/google - 驗證 Google id_token 或接受 dev_uid
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
import json

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()


class GoogleLoginRequest(BaseModel):
    id_token: Optional[str] = None
    dev_uid: Optional[str] = None


class LoginResponse(BaseModel):
    uid: str
    email: str
    name: str


@router.post("/google", response_model=LoginResponse)
async def google_login(request: GoogleLoginRequest):
    """
    Google OAuth2 登入端點。

    開發模式 (GOOGLE_CLIENT_ID 為空)：
        接受 { "dev_uid": "test_user_001" }

    生產模式：
        接受 { "id_token": "..." }，驗證後返回使用者資訊。
    """
    # ── 開發模式 ──
    if not settings.google_client_id:
        if request.dev_uid:
            logger.info(f"[Auth] 🔧 開發模式登入 - dev_uid: {request.dev_uid}")
            return LoginResponse(
                uid=request.dev_uid,
                email=f"{request.dev_uid}@dev.local",
                name=request.dev_uid,
            )
        raise HTTPException(status_code=400, detail="開發模式需提供 dev_uid")

    # ── 生產模式：驗證 Google id_token ──
    if not request.id_token:
        raise HTTPException(status_code=400, detail="需提供 Google id_token")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        id_info = id_token.verify_oauth2_token(
            request.id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
        uid = id_info["sub"]
        email = id_info.get("email", "")
        name = id_info.get("name", "")
        logger.info(f"[Auth] ✅ Google 登入成功 - UID: {uid}, Email: {email}")
        return LoginResponse(uid=uid, email=email, name=name)

    except ValueError as e:
        logger.error(f"[Auth] ❌ Google id_token 驗證失敗: {e}")
        raise HTTPException(status_code=401, detail=f"Token 驗證失敗: {str(e)}")

# ─── Auth Dependency ───

async def verify_google_token(
    authorization: Optional[str] = Header(None),
    dev_uid: Optional[str] = Header(None, alias="X-Dev-UID")
) -> str:
    """
    FastAPI 依賴項：驗證請求中的身分。
    優先順序：
    1. Authorization: Bearer <id_token> (生產模式)
    2. X-Dev-UID: <uid> (開發模式)
    """
    # ── 開發模式 ──
    if not settings.google_client_id:
        if dev_uid:
            return dev_uid
        # 如果前端還是在用 query params (舊版)，這裡可以作為 fallback
        # 但建議統一使用 Header
        return "test_user_001" 

    # ── 生產模式 ──
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供有效的認證 Header")
    
    token_str = authorization.split(" ")[1]
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        id_info = id_token.verify_oauth2_token(
            token_str,
            google_requests.Request(),
            settings.google_client_id,
        )
        return id_info["sub"]
    except Exception as e:
        logger.error(f"[Auth] Token 驗證失敗: {e}")
        raise HTTPException(status_code=401, detail="認證無效")

