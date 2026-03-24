"""
graph/graph_builder.py - LangGraph StateGraph 組裝

流程：START → retrieve → chat → (條件路由) → summarize → END
                                             ↘ END

用 AsyncConnectionPool 持有長期 DB 連線，直接傳給 AsyncPostgresSaver，
由 FastAPI lifespan 管理生命週期 (init_graph / close_graph)。
"""
import logging
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from graph.state import TherapyState
from graph.nodes import retrieve_node, chat_node, summarize_node
from graph.edges import should_summarize
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# 全域物件 (由 FastAPI lifespan 管理)
_pool: AsyncConnectionPool | None = None
_compiled_graph = None


async def init_graph():
    """
    初始化 LangGraph StateGraph。
    由 FastAPI lifespan startup 呼叫。
    使用 AsyncConnectionPool 作為長期 DB 連線，傳給 AsyncPostgresSaver。
    """
    global _pool, _compiled_graph

    logger.info("[Graph] 初始化 AsyncConnectionPool for checkpointer...")

    _pool = AsyncConnectionPool(
        conninfo=settings.database_url,
        min_size=1,
        max_size=5,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
        open=False,
    )
    await _pool.open()
    logger.info("[Graph] ✅ Checkpointer 連線池啟動完成")

    # 建立 checkpointer（傳入 pool）
    checkpointer = AsyncPostgresSaver(conn=_pool)
    await checkpointer.setup()
    logger.info("[Graph] ✅ PostgresSaver Checkpointer 初始化完成")

    # 建立 StateGraph
    builder = StateGraph(TherapyState)

    builder.add_node("retrieve", retrieve_node)
    builder.add_node("chat", chat_node)
    builder.add_node("summarize", summarize_node)

    builder.add_edge(START, "retrieve")
    builder.add_edge("retrieve", "chat")

    builder.add_conditional_edges(
        "chat",
        should_summarize,
        {"summarize": "summarize", END: END},
    )
    builder.add_edge("summarize", END)

    _compiled_graph = builder.compile(checkpointer=checkpointer)
    logger.info("[Graph] ✅ StateGraph 編譯完成")
    return _compiled_graph


async def close_graph():
    """
    關閉 checkpointer 連線池。
    由 FastAPI lifespan shutdown 呼叫。
    """
    global _pool, _compiled_graph
    if _pool:
        await _pool.close()
        _pool = None
        _compiled_graph = None
        logger.info("[Graph] Checkpointer 連線池已關閉")


async def get_graph():
    """取得全域編譯好的 Graph 實例。"""
    global _compiled_graph
    if _compiled_graph is None:
        await init_graph()
    return _compiled_graph


async def invoke_graph(user_id: str, user_message: str) -> str:
    """
    呼叫 Graph 處理單輪對話。
    """
    from langchain_core.messages import HumanMessage, HumanMessage as HM

    graph = await get_graph()

    config = {
        "configurable": {
            "thread_id": user_id,
        }
    }

    input_state = {
        "messages": [HumanMessage(content=user_message)],
        "user_id": user_id,
    }

    logger.info(f"[Graph] 🚀 Graph invoke 開始 (user_id: {user_id})")

    result = await graph.ainvoke(input_state, config=config)

    final_messages = result.get("messages", [])
    for msg in reversed(final_messages):
        if hasattr(msg, "content") and msg.content and not isinstance(msg, HM):
            logger.info("[Graph] ✅ Graph invoke 完成")
            return msg.content

    logger.warning("[Graph] ⚠️  Graph 未返回有效的 AI 回應")
    return "抱歉，系統暫時無法回應，請稍後再試。"


async def astream_graph(user_id: str, user_message: str):
    """
    非同步 Generator，執行 LangGraph 並透過 SSE 串流回傳 LLM 產生的文字片段 (Tokens)。
    使用 Stream Mode "messages" 來抓取底層 LLM 的 output。
    """
    from langchain_core.messages import HumanMessage
    
    graph = await get_graph()
    
    config = {
        "configurable": {"thread_id": user_id}
    }
    
    input_state = {
        "messages": [HumanMessage(content=user_message)],
        "user_id": user_id
    }
    
    async for chunk, metadata in graph.astream(input_state, config, stream_mode="messages"):
        node_name = metadata.get("langgraph_node")
        # logger.info(f"[Graph] astream chunk from node: {node_name}")
        if node_name == "chat":
            text = chunk.content
            if text:
                yield text

async def aedit_last_message(user_id: str, new_message: str):
    """
    非同步 Generator，用於「編輯最後一句話」功能。
    會將 LangGraph thread 狀態溯源，刪除最後一個 HumanMessage 及其之後的 AIMessage，
    然後直接將新訊息傳入 astream_graph 重產回合。
    """
    from langchain_core.messages import HumanMessage, AIMessage, RemoveMessage
    
    graph = await get_graph()
    config = {"configurable": {"thread_id": user_id}}
    
    # 取得當前歷史狀態
    state = await graph.aget_state(config)
    messages = state.values.get("messages", [])
    
    removes = []
    # 尋找最後一對 Human -> AI 訊息
    human_idx = -1
    for i in range(len(messages) - 1, -1, -1):
        if isinstance(messages[i], HumanMessage):
            human_idx = i
            break
            
    if human_idx != -1:
        removes.append(RemoveMessage(id=messages[human_idx].id))
        # 刪除 HumanMessage 之後的所有 AI 訊息（也就是該回合的回應）
        for i in range(human_idx + 1, len(messages)):
            if isinstance(messages[i], AIMessage):
                removes.append(RemoveMessage(id=messages[i].id))
        
        # 進行狀態更新（時光倒流）
        if removes:
            await graph.aupdate_state(config, {"messages": removes})
            logger.info(f"[Graph] ✏️ 編輯模式：已移除舊對話 (user_id: {user_id}), 準備重新推理")

    # 直接串流重跑新訊息
    async for chunk in astream_graph(user_id, new_message):
        yield chunk
