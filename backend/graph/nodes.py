"""
graph/nodes.py - LangGraph 三個核心 Node

1. retrieve_node  - Embedding + pgvector Hybrid Search 長期記憶
2. chat_node      - Prompt 組裝 + Gemini 呼叫
3. summarize_node - 對話壓縮 + Metadata 提取 + 寫入 pgvector
"""
import json
import logging
from datetime import datetime

import psycopg
from langchain_core.messages import HumanMessage, SystemMessage, RemoveMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from config import get_settings
from db.database import get_pool
from graph.state import TherapyState
from prompts.therapist_persona import build_therapist_system_prompt
from prompts.summarize_prompt import (
    SUMMARIZE_SYSTEM_PROMPT,
    build_summarize_user_message,
)

logger = logging.getLogger(__name__)
settings = get_settings()

# ─── LLM & Embedding 初始化 ───────────────────────────────────────────────────

def _get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=settings.google_api_key,
        temperature=0.7,
        thinking={"thinking_level": "medium"}
    )


def _get_embedding_model() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model=settings.embedding_model,
        google_api_key=settings.google_api_key,
    )


# ─── Node 1: Retrieve Node ────────────────────────────────────────────────────

async def retrieve_node(state: TherapyState) -> dict:
    """
    接收最新使用者訊息，轉換為 Embedding，
    透過 pgvector Hybrid Search 撈取相關長期記憶。
    """
    logger.info("[Graph] 🔍 執行 RetrieveNode - 開始長期記憶檢索")

    # 找到最新的 HumanMessage
    user_message = ""
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            user_message = msg.content
            break

    if not user_message:
        logger.warning("[Graph] ⚠️  RetrieveNode: 未找到 HumanMessage，跳過檢索")
        return {"retrieved_context": ""}

    user_id = state.get("user_id", "")

    try:
        # 生成查詢向量
        embedding_model = _get_embedding_model()
        query_embedding = await embedding_model.aembed_query(user_message)
        logger.info(f"[Graph] Embedding 生成完成 (維度: {len(query_embedding)})")

        # pgvector Hybrid Search: WHERE user_id + 向量相似度排序
        pool = await get_pool()
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT content, topics, intensity,
                           1 - (embedding <=> %s::halfvec) AS similarity
                    FROM therapy_memories
                    WHERE user_id = %s
                    ORDER BY embedding <=> %s::halfvec
                    LIMIT 3
                    """,
                    (query_embedding, user_id, query_embedding),
                )
                rows = await cur.fetchall()

        if not rows:
            logger.info("[Graph] RetrieveNode: 無相關長期記憶")
            return {"retrieved_context": ""}

        # 組裝檢索結果文字
        context_parts = []
        for row in rows:
            content, topics, intensity, similarity = row
            topics_str = "、".join(topics) if topics else "未標記"
            context_parts.append(
                f"【相關記憶 (相似度: {similarity:.2f})】\n"
                f"話題：{topics_str} | 情緒強度：{intensity}/10\n"
                f"{content}"
            )
        retrieved_context = "\n\n".join(context_parts)
        logger.info(f"[Graph] ✅ RetrieveNode 完成，撈回 {len(rows)} 條長期記憶")
        return {"retrieved_context": retrieved_context}

    except Exception as e:
        logger.error(f"[Graph] ❌ RetrieveNode 錯誤: {e}", exc_info=True)
        return {"retrieved_context": ""}


# ─── Node 2: Chat Node ────────────────────────────────────────────────────────

async def chat_node(state: TherapyState) -> dict:
    """
    組裝 Prompt（系統人設 + 滾動摘要 + 長期記憶 + 對話紀錄），
    呼叫 Gemini 生成治療師回應。
    """
    messages = state["messages"]
    summary = state.get("summary", "")
    retrieved_context = state.get("retrieved_context", "")

    logger.info(
        f"[Graph] 💬 執行 ChatNode, 目前 messages 數量: {len(messages)}, "
        f"摘要字數: {len(summary)}, 長期記憶字數: {len(retrieved_context)}"
    )

    # 組裝系統提示詞
    system_content = build_therapist_system_prompt(
        summary=summary,
        retrieved_context=retrieved_context,
    )
    system_message = SystemMessage(content=system_content)

    # 組合最終 Prompt
    prompt_messages = [system_message] + list(messages)

    llm = _get_llm()
    try:
        response = await llm.ainvoke(prompt_messages)
        logger.info(f"[Graph] ✅ ChatNode 完成，回應長度: {len(response.content)} 字")
        return {"messages": [response]}
    except Exception as e:
        logger.error(f"[Graph] ❌ ChatNode 錯誤: {e}", exc_info=True)
        raise


# ─── Node 3: Summarize Node ──────────────────────────────────────────────────

async def summarize_node(state: TherapyState) -> dict:
    """
    壓縮過舊對話，提取 Metadata (topics, intensity)，
    更新滾動式摘要，並將語意片段寫入 pgvector。
    清空 State 中過舊的 messages 以釋放 Context Window。
    """
    messages = state["messages"]
    existing_summary = state.get("summary", "")
    user_id = state.get("user_id", "")

    logger.info(f"[Graph] 📝 執行 SummarizeNode, 壓縮 {len(messages)} 條訊息")

    # 將要壓縮的 messages 轉為文字
    conversation_text = "\n".join(
        f"{'使用者' if isinstance(m, HumanMessage) else 'AI 治療師'}: {m.content}"
        for m in messages
        if hasattr(m, "content") and m.content
    )

    # 呼叫 LLM 生成摘要 + Metadata (純文字模式，自行解析 JSON)
    llm = _get_llm()
    summarize_messages = [
        SystemMessage(content=SUMMARIZE_SYSTEM_PROMPT),
        HumanMessage(content=build_summarize_user_message(existing_summary, conversation_text)),
    ]

    try:
        response = await llm.ainvoke(summarize_messages)
        raw_text = response.content.strip()

        # 解析 JSON 輸出
        # 處理 LLM 可能在 JSON 外包裹 markdown code block 的情況
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()

        metadata = json.loads(raw_text)
        new_summary: str = metadata.get("summary_text", "")
        topics: list[str] = metadata.get("topics", [])
        intensity: int = int(metadata.get("intensity", 5))

        logger.info(
            f"[Graph] 摘要完成 | topics: {topics} | intensity: {intensity}/10"
        )

    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"[Graph] ❌ 解析 Summarize 輸出失敗: {e}，使用原始文字作為摘要")
        new_summary = raw_text if raw_text else existing_summary
        topics = []
        intensity = 5

    # 將壓縮內容寫入 pgvector 長期記憶
    if new_summary and user_id:
        await _save_to_long_term_memory(
            user_id=user_id,
            content=new_summary,
            topics=topics,
            intensity=intensity,
        )

    # 清空過舊 messages（保留最後 2 條，維持對話連貫性）
    messages_to_remove = messages[:-2] if len(messages) > 2 else messages[:-1]
    remove_ops = [RemoveMessage(id=m.id) for m in messages_to_remove if m.id]

    logger.info(
        f"[Graph] ✅ SummarizeNode 完成，清除 {len(remove_ops)} 條舊訊息，更新摘要"
    )

    return {"summary": new_summary, "messages": remove_ops}


async def _save_to_long_term_memory(
    user_id: str,
    content: str,
    topics: list[str],
    intensity: int,
    chunk_type: str = "summary",
) -> None:
    """將摘要向量化後存入 therapy_memories 資料表。"""
    try:
        embedding_model = _get_embedding_model()
        embedding = await embedding_model.aembed_query(content)

        pool = await get_pool()
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO therapy_memories
                        (user_id, content, embedding, topics, intensity, chunk_type)
                    VALUES (%s, %s, %s::halfvec, %s, %s, %s)
                    """,
                    (user_id, content, embedding, topics, intensity, chunk_type),
                )
                await conn.commit()
        logger.info(f"[DB] ✅ 長期記憶寫入成功 (user_id: {user_id})")

    except Exception as e:
        logger.error(f"[DB] ❌ 長期記憶寫入失敗: {e}", exc_info=True)
