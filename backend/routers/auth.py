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
    x_dev_uid: Optional[str] = Header(None, alias="X-Dev-UID"),
    dev_uid: Optional[str] = None # Will be populated if sent as query param
) -> str:
    """
    FastAPI 依賴項：驗證請求中的身分。
    優先順序：
    1. Authorization: Bearer <id_token> (生產模式)
    2. X-Dev-UID header (開發模式)
    3. dev_uid query parameter (開發模式)
    """
    # 1. 檢查 Google id_token (生產模式優先)
    if settings.google_client_id and authorization and authorization.startswith("Bearer "):
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

    # 2. 檢查開發模式 UID (當 GOOGLE_CLIENT_ID 為空或強行傳入時)
    # 優先從 Header 取得，再從 Query 取得
    effective_uid = x_dev_uid or dev_uid

    if effective_uid:
        return effective_uid

    # 3. 如果都沒有且為開發模式，回傳預設匿名 ID
    if not settings.google_client_id:
        # 不再硬編碼 test_user_001，改為 dev_anonymous 以免混淆
        return "dev_anonymous"

    # 4. 生產模式下若無 token 則攔截
    raise HTTPException(status_code=401, detail="未提供有效的認證資訊")

