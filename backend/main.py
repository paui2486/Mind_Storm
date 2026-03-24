"""
main.py - FastAPI 應用程式入口

包含：
- Lifespan: startup 時初始化 DB 連線池與 LangGraph
- CORS 設定 (開發模式全開)
- 路由掛載
"""
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import get_settings
from db.database import get_pool, close_pool
from graph.graph_builder import init_graph, close_graph
from routers.chat import router as chat_router
from routers.auth import router as auth_router
from routers.journal import router as journal_router
from routers.settings import router as settings_router

settings = get_settings()

# ─── Logging 設定 ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


# ─── Lifespan (Startup / Shutdown) ───────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 生命週期管理：startup 初始化資源，shutdown 釋放資源。"""
    logger.info("=" * 60)
    logger.info("🧠 AI 心理治療師系統 - 啟動中...")
    logger.info("=" * 60)

    # 1. 初始化 DB 連線池
    await get_pool()

    # 2. 初始化 LangGraph (建立 checkpointer 資料表)
    await init_graph()

    logger.info("✅ 系統啟動完成，準備接受連線")
    logger.info("=" * 60)

    yield  # 服務運行中

    # Shutdown
    logger.info("⛔ 系統關閉中...")
    await close_graph()  # 關閉 LangGraph checkpointer 連線
    await close_pool()   # 關閉 DB 連線池
    logger.info("✅ 資源已釋放")


# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI 心理治療師系統",
    description="基於 LangGraph 的 AI 心理治療師後端 API，結合 CBT、ACT 與阿德勒心理學。",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS (開發模式：全開；生產環境請限制 origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由掛載
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(journal_router, prefix="/api/journal", tags=["Journal"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])


@app.get("/health", tags=["health"])
async def health_check():
    """健康檢查端點。"""
    return {"status": "ok", "service": "AI 心理治療師系統"}


# ─── Static Files & SPA Fallback ─────────────────────────────────────────────
frontend_dir = Path(settings.frontend_dir)
if frontend_dir.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """SPA fallback：所有非 API 路徑都返回 index.html。"""
        # 防止 API 路徑找不到時回傳 HTML，導致前端 JSON Parse 錯誤
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API route not found")
            
        # If the requested file exists in dist, serve it
        file_path = frontend_dir / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Otherwise serve index.html for SPA routing
        return FileResponse(frontend_dir / "index.html")
else:
    logger.warning(f"⚠️ Frontend dist 目錄不存在: {frontend_dir}，跳過靜態檔案掛載")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
