import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import psycopg
from db.database import get_pool
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()

class DeleteResult(BaseModel):
    deleted: bool
    message: str

@router.delete("/memory", response_model=DeleteResult)
async def delete_user_memory(user_id: str):
    """
    原子化刪除使用者的所有記憶：
    1. Long-term memory (therapy_memories)
    2. Short-term checkpoints (checkpoint_writes, checkpoint_blobs, checkpoints)
    """
    logger.info(f"[Settings] 🗑️ 請求刪除使用者 {user_id} 的所有記憶")
    
    pool = await get_pool()
    try:
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                # 執行原子化刪除交易
                # 1. 刪除長期記憶
                await cur.execute("DELETE FROM therapy_memories WHERE user_id = %s", (user_id,))
                
                # 2. 刪除 LangGraph Checkpoints
                # 在我們的系統設計中，thread_id 通常與 user_id 綁定或包含 user_id
                # 這裡假設 thread_id == user_id (如 chat.py 中所示)
                await cur.execute("DELETE FROM checkpoint_writes WHERE thread_id = %s", (user_id,))
                await cur.execute("DELETE FROM checkpoint_blobs WHERE thread_id = %s", (user_id,))
                await cur.execute("DELETE FROM checkpoints WHERE thread_id = %s", (user_id,))
                
                await conn.commit()
                
        logger.info(f"[Settings] ✅ 使用者 {user_id} 記憶已清除完畢")
        return DeleteResult(deleted=True, message="所有記憶已成功清除。")
        
    except Exception as e:
        logger.error(f"[Settings] ❌ 刪除記憶失敗: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"刪除失敗: {str(e)}")
