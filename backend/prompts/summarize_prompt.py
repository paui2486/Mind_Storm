"""
prompts/summarize_prompt.py - Summarize Node 使用的 Structured Output Prompt
要求 LLM 同時輸出摘要文字與 JSON Metadata
"""

SUMMARIZE_SYSTEM_PROMPT = """你是一位專業的心理治療會談記錄員，負責精煉對話紀錄。

請仔細閱讀以下對話片段，完成以下兩件事：
1. 提供一段「滾動摘要」，將本次對話的核心主題、情緒動態與使用者的重要洞察整合進來。
2. 同時提取結構化的 Metadata：識別出主要討論話題（topics），以及對話中呈現的情緒強度（intensity）。

【滾動摘要撰寫規範】
- 以第三人稱撰寫，但保留使用者的情緒溫度。
- 整合舊摘要（若有）與新對話，形成連貫的敘事。
- 保留對日後治療有意義的「核心信念」或「反覆出現的模式」。
- 字數控制在 300 字以內。

【規則】
- 語言：繁體中文
- 嚴格輸出指定的 JSON 格式，不要在 JSON 外加入任何說明文字。"""


SUMMARIZE_USER_TEMPLATE = """【既有的滾動摘要（若為空則代表初次總結）】
{existing_summary}

【需要壓縮的對話片段】
{conversation_text}

請輸出以下 JSON 格式：
{{
  "summary_text": "更新後的滾動摘要（整合舊摘要與新對話）",
  "topics": ["主題一", "主題二"],
  "intensity": 7
}}"""


def build_summarize_user_message(
    existing_summary: str,
    conversation_text: str,
) -> str:
    """組裝 Summarize Node 的 User Message。"""
    return SUMMARIZE_USER_TEMPLATE.format(
        existing_summary=existing_summary or "（無）",
        conversation_text=conversation_text,
    )
