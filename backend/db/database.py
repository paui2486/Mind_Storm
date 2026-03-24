"""
db/database.py - psycopg3 async 連線池管理
"""
import logging
import psycopg
from psycopg_pool import AsyncConnectionPool
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# 全域連線池 (由 FastAPI lifespan 管理生命週期)
_pool: AsyncConnectionPool | None = None


async def get_pool() -> AsyncConnectionPool:
    """取得全域連線池，若尚未初始化則建立。"""
    global _pool
    if _pool is None:
        logger.info("[DB] 初始化 PostgreSQL 連線池...")
        _pool = AsyncConnectionPool(
            conninfo=settings.database_url,
            min_size=2,
            max_size=10,
            open=False,
        )
        await _pool.open()
        logger.info("[DB] ✅ PostgreSQL 連線池啟動完成")
    return _pool


async def close_pool():
    """關閉連線池 (由 FastAPI lifespan 在 shutdown 時呼叫)。"""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("[DB] 連線池已關閉")


async def get_connection():
    """FastAPI Dependency: 從連線池取得一條連線。"""
    pool = await get_pool()
    async with pool.connection() as conn:
        yield conn
