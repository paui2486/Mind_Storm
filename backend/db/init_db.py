"""
db/init_db.py - 初始化資料庫 Schema
執行方式: python db/init_db.py (在 backend/ 目錄下)
"""
import asyncio
import logging
import os
import sys

# 讓腳本能在 backend/ 目錄下直接執行
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg
from config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


async def init_schema():
    settings = get_settings()
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")

    logger.info(f"[DB] 連線至: {settings.database_url}")

    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    async with await psycopg.AsyncConnection.connect(settings.database_url) as conn:
        async with conn.cursor() as cur:
            logger.info("[DB] 執行 Schema 初始化...")
            await cur.execute(schema_sql)
            await conn.commit()
            logger.info("[DB] ✅ Schema 初始化完成！therapy_memories 資料表與索引已就緒")


if __name__ == "__main__":
    asyncio.run(init_schema())
