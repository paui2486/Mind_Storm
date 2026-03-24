"""
graph/edges.py - 條件路由函數

決定 chat_node 之後是否需要觸發 summarize_node。
"""
import logging
from langgraph.graph import END
from graph.state import TherapyState

logger = logging.getLogger(__name__)


def should_summarize(state: TherapyState) -> str:
    """
    條件路由：判斷對話 messages 數量是否超過閾值。
    - 超過閾值 → 'summarize'
    - 未超過   → END
    """
    from config import get_settings
    settings = get_settings()

    message_count = len(state.get("messages", []))
    threshold = settings.summarize_threshold

    logger.info(
        f"[Graph] 🔀 路由判斷 - messages 數量: {message_count} / 閾值: {threshold}"
    )

    if message_count >= threshold:
        logger.info("[Graph] → 觸發 SummarizeNode")
        return "summarize"
    else:
        logger.info("[Graph] → 對話結束 (END)")
        return END
