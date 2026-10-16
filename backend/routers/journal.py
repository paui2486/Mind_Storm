from fastapi import APIRouter, Depends, HTTPException
import psycopg
from psycopg.rows import dict_row
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from config import get_settings
from db.database import get_pool
from routers.auth import verify_google_token

router = APIRouter()
settings = get_settings()

class JournalEntry(BaseModel):
    id: int
    content: str
    topics: List[str]
    intensity: int
    chunk_type: str
    created_at: datetime

@router.get("", response_model=List[JournalEntry])
async def get_journals(uid: str = Depends(verify_google_token)):
    """
    獲取目前使用者的日誌紀錄 (長期記憶)
    """
    try:
        pool = await get_pool()
        async with pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    """
                    SELECT id, content, topics, intensity, chunk_type, created_at
                    FROM therapy_memories
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT 100
                    """,
                    (uid,)
                )
                rows = await cur.fetchall()
                
                # topics might be stored as list string, psycopg handles arrays automatically if defined as TEXT[]
                results = []
                for row in rows:
                    results.append(JournalEntry(
                        id=row["id"],
                        content=row["content"],
                        topics=row["topics"] if row["topics"] else [],
                        intensity=row["intensity"] if row["intensity"] is not None else 5,
                        chunk_type=row["chunk_type"] or "summary",
                        created_at=row["created_at"]
                    ))
                return results
    except Exception as e:
        import logging
        logging.error(f"[Journal] 獲取日誌失敗 (uid: {uid}): {e}")
        raise HTTPException(status_code=500, detail="無法獲取日誌資料")
