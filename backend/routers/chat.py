"""
routers/chat.py - /api/chat 對話端點

POST /api/chat  - 接收使用者訊息，呼叫 LangGraph，回傳 SSE (Server-Sent Events) 串流
GET  /api/chat/history - 取得對話歷史
"""
import logging
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth.google_auth import verify_google_token
from graph.graph_builder import invoke_graph, get_graph, astream_graph
from langchain_core.messages import HumanMessage, AIMessage

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    user_id: str


class HistoryMessage(BaseModel):
    role: str  # "user" | "ai"
    content: str


class HistoryResponse(BaseModel):
    messages: list[HistoryMessage]


@router.post("")
async def chat(
    request: ChatRequest,
    uid: str = Depends(verify_google_token),
):
    """
    主要對話端點 (SSE 串流)。

    開發模式：POST /api/chat?dev_uid=test_user_001
    生產模式：需在 Header 中帶入 Authorization: Bearer <id_token>

    Request Body:
        { "message": "我最近壓力很大..." }

    Response (Server-Sent Events):
        data: {"text": "我"}
        data: {"text": "聽到"}
        data: {"text": "了"}
        data: {"done": true}
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="訊息不能為空")

    logger.info(f"[Chat] 準備開始串流 (user_id: {uid}) | 長度: {len(request.message)} 字")

    async def event_generator():
        try:
            async for chunk in astream_graph(uid, request.message.strip()):
                # 傳送文字片段
                yield f"data: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
            
            # 結束標記
            yield f"data: {json.dumps({'done': True})}\n\n"
            logger.info(f"[Chat] ✅ 串流結束 (user_id: {uid})")
            
        except Exception as e:
            logger.error(f"[Chat] ❌ 串流過程發生錯誤 (user_id: {uid}): {e}", exc_info=True)
            yield f"data: {json.dumps({'error': '系統處理發生錯誤，請稍後再試'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.put("/edit")
async def edit_chat(
    request: ChatRequest,
    uid: str = Depends(verify_google_token),
):
    """
    編輯最後一次對話的端點 (SSE 串流)。
    從 LangGraph 抹除最後一次問答，替換為 request.message 並重新產出回覆。

    開發模式：PUT /api/chat/edit?dev_uid=test_user_001
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="訊息不能為空")

    logger.info(f"[Chat] 準備編輯最後訊息 (user_id: {uid}) | 新長度: {len(request.message)} 字")

    async def event_generator():
        try:
            # 引入在 graph_builder 實作的編輯邏輯
            from graph.graph_builder import aedit_last_message
            async for chunk in aedit_last_message(uid, request.message.strip()):
                yield f"data: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
            
            yield f"data: {json.dumps({'done': True})}\n\n"
            logger.info(f"[Chat] ✅ 編輯串流結束 (user_id: {uid})")
            
        except Exception as e:
            logger.error(f"[Chat] ❌ 編輯過程發生錯誤 (user_id: {uid}): {e}", exc_info=True)
            yield f"data: {json.dumps({'error': '系統處理發生錯誤，請稍後再試'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/history", response_model=HistoryResponse)
async def chat_history(
    uid: str = Depends(verify_google_token),
    limit: int = 50,
):
    """
    取得對話歷史。

    從 PostgresSaver checkpointer 讀取 thread_id = uid 的歷史訊息。
    返回最近 limit 條訊息，按時間順序排列。

    開發模式：GET /api/chat/history?dev_uid=test_user_001
    """
    logger.info(f"[Chat] 📜 取得歷史 (user_id: {uid}, limit: {limit})")

    try:
        graph = await get_graph()
        config = {"configurable": {"thread_id": uid}}

        # Get the current state from checkpointer
        state = await graph.aget_state(config)

        if not state or not state.values:
            logger.info(f"[Chat] 無歷史紀錄 (user_id: {uid})")
            return HistoryResponse(messages=[])

        raw_messages = state.values.get("messages", [])
        history = []

        for msg in raw_messages:
            if isinstance(msg, HumanMessage) and msg.content:
                history.append(HistoryMessage(role="user", content=msg.content))
            elif isinstance(msg, AIMessage) and msg.content:
                history.append(HistoryMessage(role="ai", content=msg.content))

        # Limit to last N messages
        history = history[-limit:]

        logger.info(f"[Chat] ✅ 返回 {len(history)} 條歷史訊息 (user_id: {uid})")
        return HistoryResponse(messages=history)

    except Exception as e:
        logger.error(f"[Chat] ❌ 取得歷史失敗 (user_id: {uid}): {e}", exc_info=True)
        return HistoryResponse(messages=[])
