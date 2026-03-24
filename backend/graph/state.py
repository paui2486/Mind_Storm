"""
graph/state.py - LangGraph TherapyState 定義

對話狀態包含：
- messages: 短期對話記錄 (由 PostgresSaver checkpointer 持久化)
- summary:  滾動式摘要 (由 Summarize Node 更新)
- retrieved_context: 從 pgvector 撈回的長期記憶 (由 Retrieve Node 更新)
- user_id: Google UID (用於記憶隔離與 pgvector 查詢)
"""
from typing import Annotated
from typing_extensions import TypedDict
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class TherapyState(TypedDict):
    # 短期對話記錄 - add_messages reducer 確保訊息正確合併
    messages: Annotated[list[AnyMessage], add_messages]

    # 滾動式摘要 - 由 Summarize Node 更新
    summary: str

    # pgvector 長期記憶檢索結果 - 由 Retrieve Node 更新
    retrieved_context: str

    # Google UID - 記憶隔離的 Key
    user_id: str
