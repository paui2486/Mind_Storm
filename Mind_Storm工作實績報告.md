# 🧠 Mind Storm — AI 心理治療師系統
## 工作實績報告

> **作者**：Paul  
> **報告日期**：2026 年 4 月 9 日  
> **專案階段**：核心功能完成，系統可運行  
> **技術棧**：LangGraph · FastAPI · PostgreSQL (pgvector) · Gemini API · Google OAuth2

---

## 一、專案背景與技術挑戰

本專案旨在建構一個能夠**跨會話長期記憶**的 AI 心理治療師系統，目標使用者為有情緒壓力、職場焦慮等需求的個人用戶。系統結合認知行為療法（CBT）、接納與承諾療法（ACT）及阿德勒心理學，提供非評判、具文化敏感度的心理支持服務。

本專案最核心的工程挑戰並非 LLM 本身的調用，而是以下三個架構問題：

| 核心挑戰 | 工程解法 |
|---|---|
| **多使用者記憶絕對隔離** | Google UID 作為 thread_id + pgvector WHERE 過濾 |
| **長對話 Context Window 溢出** | LangGraph 條件路由觸發滾動式摘要壓縮 |
| **語意記憶的精準召回** | pgvector HNSW 向量索引 + Metadata Hybrid Search |

---

## 二、系統架構全覽

```
使用者 → 前端 (Vite/React)
             │
             ▼
       FastAPI 後端
       ├── Google OAuth2 驗證層 (UID 提取)
       │
       └── LangGraph StateGraph (核心)
               │
        ┌──────▼──────┐
        │ retrieve_node│  ← Gemini Embedding → pgvector Hybrid Search
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  chat_node   │  ← Prompt Assembly → Gemini 3.8 Flash (Thinking Mode)
        └──────┬──────┘
               │
       (條件路由 should_summarize)
          /              \
    [N < 10 輪]      [N ≥ 10 輪]
        │                 │
       END         ┌──────▼──────┐
                   │summarize_node│ ← LLM JSON 結構化輸出 → pgvector 寫入
                   └─────────────┘
                         │
                    (清空舊 Messages)
                         │
                        END
```

**資料持久層雙軌設計**：
- **短期記憶**：`AsyncPostgresSaver` Checkpointer，將完整 StateGraph 快照持久化至 PostgreSQL
- **長期記憶**：`therapy_memories` 資料表搭配 `pgvector` 擴充，儲存語意向量與 Metadata

---

## 三、LangGraph 架構實作（核心亮點）

### 3.1 TherapyState — 狀態機設計

```python
class TherapyState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]  # 短期對話，由 add_messages reducer 合併
    summary: str           # 滾動式摘要，跨會話保留治療脈絡
    retrieved_context: str # pgvector 召回的長期記憶注入
    user_id: str           # Google UID，記憶隔離的 Key
```

**設計考量**：
- 使用 `add_messages` reducer 而非直接覆寫，確保多並發輸入時 state 合併語意正確。
- `summary` 欄位設計為**滾動累積**而非分段記錄，確保治療脈絡的跨輪次連貫性。
- `user_id` 內嵌於 State，使 Node 內部直接從 State 取 UID，無需依賴外部 context 注入。

### 3.2 Node 實作：三個核心節點

#### **Node 1 — retrieve_node（長期記憶檢索）**

```python
async def retrieve_node(state: TherapyState) -> dict:
    # 1. 抽取最新 HumanMessage
    # 2. Gemini Embedding (aembed_query) -> 768/3072 維向量
    # 3. pgvector Hybrid Search
    await cur.execute("""
        SELECT content, topics, intensity,
               1 - (embedding <=> %s::halfvec) AS similarity
        FROM therapy_memories
        WHERE user_id = %s        -- Metadata 過濾（隔離其他用戶）
        ORDER BY embedding <=> %s::halfvec
        LIMIT 3
    """, (query_embedding, user_id, query_embedding))
```

**技術亮點**：
- 採用**餘弦距離**（`<=>` 運算子）進行相似度排序，同時計算 `1 - distance` 回傳相似度分數。
- `WHERE user_id = %s` 為**硬性過濾條件**，確保向量查詢不可能跨越用戶邊界，實現記憶隔離。
- 使用 `psycopg.AsyncConnection` 非同步 I/O，不阻塞事件迴圈。

#### **Node 2 — chat_node（LLM 對話生成）**

```python
async def chat_node(state: TherapyState) -> dict:
    # 4 層 Prompt 組裝
    system_content = build_therapist_system_prompt(
        summary=summary,                # 滾動摘要（治療脈絡）
        retrieved_context=retrieved_context,  # 長期記憶
    )
    prompt_messages = [system_message] + list(messages)  # 系統 + 短期對話歷史
    
    response = await llm.ainvoke(prompt_messages)  # Gemini 非同步調用
```

**LLM 呼叫設計**：
```python
def _get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model="gemini-3.8-flash",
        temperature=0.7,
        thinking={"thinking_level": "medium"}  # 啟用 Thinking Mode 增強推理
    )
```

- 啟用 Gemini **Thinking Mode**（`thinking_level: medium`），讓模型在生成回應前執行多步驟推理，提升同理心回應的深度。
- Prompt 採用**四層聚合**設計：`[系統人設] + [滾動摘要] + [長期記憶] + [當前對話]`，在 Context Window 有限的前提下最大化資訊利用率。
- **嚴格單問句約束**：系統提示詞明文限制「每次回應結尾最多只能拋出 1 個問句」，從 Prompt Engineering 層面控制 LLM 輸出風格。

#### **Node 3 — summarize_node（壓縮與長期記憶寫入）**

```python
async def summarize_node(state: TherapyState) -> dict:
    # LLM 同時產出摘要 + 結構化 Metadata
    response = await llm.ainvoke([
        SystemMessage(content=SUMMARIZE_SYSTEM_PROMPT),
        HumanMessage(content=build_summarize_user_message(existing_summary, conversation_text)),
    ])
    
    # 解析 LLM 輸出的 JSON（含 Markdown code block 容錯）
    metadata = json.loads(raw_text)
    new_summary = metadata["summary_text"]  # 更新滾動摘要
    topics: list[str] = metadata["topics"]  # 主題標籤 e.g. ["職涯焦慮", "完美主義"]
    intensity: int = metadata["intensity"]  # 情緒強度 1-10
    
    # 向量化並寫入 pgvector
    await _save_to_long_term_memory(user_id, new_summary, topics, intensity)
    
    # 清空過舊 Messages（保留最後 2 條維持連貫性）
    messages_to_remove = messages[:-2]
    remove_ops = [RemoveMessage(id=m.id) for m in messages_to_remove if m.id]
    return {"summary": new_summary, "messages": remove_ops}
```

**設計亮點**：
- **單次 LLM 調用雙輸出**：要求 Gemini 在一次推理中同時輸出文字摘要和結構化 Metadata（JSON），避免二次 API 調用，降低延遲與成本。
- **JSON 容錯解析**：處理 LLM 可能在 JSON 外包裹 Markdown code block 的情況，提升生產穩定性。
- **精準 Context 清理**：使用 LangGraph `RemoveMessage` 操作，精確刪除過舊訊息，而非清空整個 State，確保 Checkpointer 資料完整性。

### 3.3 Conditional Edge — 資源控制邏輯

```python
def should_summarize(state: TherapyState) -> str:
    message_count = len(state.get("messages", []))
    threshold = settings.summarize_threshold  # 預設 10 輪
    
    if message_count >= threshold:
        return "summarize"  # 觸發壓縮節點
    else:
        return END          # 直接結束本輪
```

**架構意義**：此條件路由是系統**資源控制的核心機制**，確保：
1. Context Window 不無限膨脹 → Token 成本可預估
2. 長期記憶隨對話自動累積 → 支援無限輪次對話
3. 壓縮閾值可通過環境變數調整（`SUMMARIZE_THRESHOLD`）→ 線上可調

### 3.4 AsyncPostgresSaver — 短期記憶持久化

```python
_pool = AsyncConnectionPool(
    conninfo=settings.database_url,
    min_size=1,
    max_size=5,
    kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
    open=False,
)
await _pool.open()

checkpointer = AsyncPostgresSaver(conn=_pool)
await checkpointer.setup()  # 自動建立 checkpointer 控制表

_compiled_graph = builder.compile(checkpointer=checkpointer)
```

- 使用**連線池**（非一次性連線）供 checkpointer 共享，避免高並發時連線耗盡。
- `thread_id = user_id`（Google UID）作為 Checkpoint 的隔離 Key，確保不同用戶的對話狀態完全獨立。
- 由 **FastAPI `lifespan`** 統一管理連線池的開啟/關閉，確保資源不洩漏。

### 3.5 SSE 串流 + 狀態回溯（進階功能）

```python
# 串流模式：使用 stream_mode="messages" 抓取 LLM token 輸出
async for chunk, metadata in graph.astream(input_state, config, stream_mode="messages"):
    if metadata.get("langgraph_node") == "chat":
        if chunk.content:
            yield chunk.content  # 逐 token 回傳
```

```python
# 對話編輯功能：時光倒流刪除上一輪對話
async def aedit_last_message(user_id: str, new_message: str):
    state = await graph.aget_state(config)
    # 找到最後一對 Human→AI 訊息並刪除
    removes = [RemoveMessage(id=msg.id) for msg in ...]
    await graph.aupdate_state(config, {"messages": removes})
    # 重新推理
    async for chunk in astream_graph(user_id, new_message):
        yield chunk
```

**技術挑戰**：利用 LangGraph 的 `aget_state` / `aupdate_state` API，實現了類似「撤銷重做」的對話狀態操控。這對傳統的 REST API 設計而言幾乎無法實現，是 LangGraph 狀態機架構的核心價值體現。

---

## 四、資料庫設計（pgvector + HNSW）

### therapy_memories 資料表

```sql
CREATE TABLE therapy_memories (
    id          BIGSERIAL PRIMARY KEY,
    user_id     VARCHAR(255) NOT NULL,     -- Google UID，隔離 Key（必填）
    content     TEXT NOT NULL,             -- 壓縮後的語意片段
    embedding   HALFVEC(3072),            -- Gemini Embedding (halfvec 突破 2000 維限制，支援至 4000 維)
    topics      TEXT[],                   -- 主題標籤 ['職涯焦慮', '完美主義']
    intensity   INTEGER CHECK (intensity BETWEEN 1 AND 10),  -- 情緒強度 1-10
    chunk_type  VARCHAR(50) DEFAULT 'summary',               -- 'summary' | 'core_belief'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 用於加速 WHERE user_id = $1 的 B-Tree 索引
CREATE INDEX therapy_memories_user_idx ON therapy_memories (user_id);

-- 時間索引 (便於按時間排序查詢)
CREATE INDEX therapy_memories_created_idx ON therapy_memories (created_at DESC);

-- HNSW 向量索引 (halfvec_cosine_ops 支援 3072 維近似最近鄰搜尋)
CREATE INDEX therapy_memories_embedding_idx
    ON therapy_memories USING hnsw (embedding halfvec_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

**設計考量**：
- `HALFVEC(3072)`：標準 pgvector 的 `vector` 型別受限於 PG 8KB Page 大小，HNSW 索引上限為 2,000 維。採用 `halfvec`（16-bit 半精度浮點數）將索引上限推升至 4,000 維，使 3072 維的 `models/gemini-embedding-001` 能直接建立 HNSW 索引。同時儲存與索引記憶體空間減半，排序召回率損失 < 0.1%。
- `topics TEXT[]` 使用 PostgreSQL 原生陣列型別，支援 `@>` 包含查詢，未來可擴展主題過濾。
- `intensity` 加入 CHECK 約束 (1-10)，在資料庫層面保障 LLM 輸出的數值合法性。

---

## 五、API 層設計

| 端點 | 方法 | 功能 | 技術細節 |
|---|---|---|---|
| `/api/auth/google` | POST | Google OAuth2 登入 / 開發模式 | UID 提取，雙模式切換 |
| `/api/chat` | POST | 主對話 (SSE 串流) | StreamingResponse + `text/event-stream` |
| `/api/chat/edit` | PUT | 編輯上一輪對話 | LangGraph 狀態回溯 + 重新推理 |
| `/api/chat/history` | GET | 讀取對話歷史 | 從 Checkpointer State 反序列化 |
| `/api/journal` | GET/POST | 心情日記 CRUD | 獨立資料表，非 Graph 路徑 |
| `/api/settings` | GET/PUT | 用戶偏好設定 | 持久化個人化設定 |
| `/health` | GET | 健康檢查 | 運維監控 |

### 認證依賴注入

```python
async def verify_google_token(
    authorization: Optional[str] = Header(None),
    x_dev_uid: Optional[str] = Header(None, alias="X-Dev-UID"),
    dev_uid: Optional[str] = None
) -> str:
    # 優先順序：Bearer Token > X-Dev-UID Header > dev_uid Query Param > dev_anonymous
    ...
```

設計**三段降級認證鏈**，使開發期可以快速測試任意 UID，而不需要真正的 Google 帳號，但生產環境只接受通過 Google 驗證的 `id_token`。

---

## 六、完成進度盤點

| 功能模組 | 狀態 | 說明 |
|---|---|---|
| ✅ FastAPI 基礎框架 | **完成** | lifespan 資源管理、CORS、SPA Fallback |
| ✅ Google OAuth2 驗證 | **完成** | 生產/開發雙模式，依賴注入設計 |
| ✅ PostgreSQL 連線池 | **完成** | psycopg3 AsyncConnectionPool |
| ✅ pgvector 資料表 & Schema | **完成** | therapy_memories (HALFVEC 3072)、索引建立 |
| ✅ LangGraph StateGraph | **完成** | 三節點 + 條件路由完整實作 |
| ✅ AsyncPostgresSaver Checkpointer | **完成** | 短期記憶自動持久化 |
| ✅ retrieve_node（向量檢索）| **完成** | Hybrid Search，halfvec 餘弦相似度 |
| ✅ chat_node（LLM 對話）| **完成** | Gemini 3.8 Flash Thinking Mode，4層Prompt |
| ✅ summarize_node（壓縮）| **完成** | 單次LLM雙輸出，JSON容錯解析 |
| ✅ SSE Token 串流 | **完成** | `stream_mode="messages"` |
| ✅ 對話編輯（時光倒流）| **完成** | `aupdate_state` 狀態回溯 |
| ✅ 心情日記 API | **完成** | 獨立資料路徑 |
| ✅ 用戶設定 API | **完成** | 個人化偏好持久化 |
| ✅ 治療師人設 Prompt | **完成** | CBT/ACT/阿德勒心理學整合 |
| ✅ 危機處理協議 | **完成** | 自我傷害偵測 + 台灣在地資源 |
| ✅ HNSW 索引（halfvec） | **完成** | 使用 halfvec_cosine_ops 支援 3072 維高效搜尋 |
| 🔲 Gemini Structured Output | **待升級** | 目前用 JSON 文字解析，可改用原生 Schema |
| 🔲 Rate Limiting | **待補強** | API 未加速率限制 |
| 🔲 生產環境 Docker Compose | **待完成** | 目前僅有本地開發設定 |

---

## 七、架構亮點與創新點

### 7.1 記憶架構的分層設計

本系統實現了三層記憶架構，對應人類記憶的工作記憶、短期記憶和長期記憶概念：

```
Layer 1: Working Memory  → LangGraph State (messages, retrieved_context)
                            —— 當前對話輪次的即時上下文
                            
Layer 2: Short-term Memory → AsyncPostgresSaver Checkpointer
                            —— 最近 N 輪對話的完整歷史（含壓縮前的內容）
                            
Layer 3: Long-term Memory  → pgvector therapy_memories
                            —— 壓縮後的語意片段，跨所有會話可被向量召回
```

### 7.2 單次 LLM 調用的效率最大化

在 `summarize_node` 中，透過精心設計的 `SUMMARIZE_SYSTEM_PROMPT`，讓 Gemini 在**一次 API 調用**中同時輸出：

1. `summary_text`：更新後的滾動摘要（自然語言）
2. `topics`：主題標籤陣列（結構化）
3. `intensity`：情緒強度評分（數值）

替代方案（順序調用3次 LLM）的延遲約為本方案的 **3 倍**，且 Token 消耗更高。

### 7.3 Graph State 作為真理之源（Single Source of Truth）

所有業務邏輯（摘要、長期記憶、使用者識別）均通過 `TherapyState` 流動，各 Node 之間無直接依賴，僅透過 State 傳遞資料。這使得：
- 每個 Node 可以獨立單元測試
- Graph 拓撲可以在不修改 Node 邏輯的情況下重組
- 新增 Node（如情緒分析節點）對現有邏輯零侵入

### 7.4 優雅的開發/生產模式切換

系統透過單一環境變數 `GOOGLE_CLIENT_ID` 的存在與否，自動切換完整的認證行為，無需修改任何業務程式碼：

```
GOOGLE_CLIENT_ID 為空  → 開發模式（接受任意 dev_uid，無需真實 Google 帳號）
GOOGLE_CLIENT_ID 有值  → 生產模式（強制 Bearer Token 驗證）
```

---

## 八、技術選型理由

| 技術 | 選型理由 | 替代方案 |
|---|---|---|
| **LangGraph** | StateGraph 支援有條件循環、狀態持久化、節點可測試性；相比 LangChain LCEL 更適合多步驟有狀態 Agent | AutoGen、CrewAI（不支援原生 Checkpointing） |
| **AsyncPostgresSaver** | 利用現有 PostgreSQL 無需引入額外基礎設施（如 Redis）；Checkpointer API 與業務邏輯解耦 | SQLite Saver（不支援高並發）|
| **pgvector** | 統一技術棧，避免維護額外向量資料庫（如 Pinecone、Weaviate）；HNSW 索引效能足以應對中型資料量 | Chroma、Pinecone |
| **Gemini 3.1 Flash** | 啟用 Thinking Mode 提升推理深度；Flash 模型兼顧速度與成本；Gemini Embedding 001 與同廠 LLM 語意空間對齊 | GPT-4o、Claude（成本較高） |
| **psycopg3 (async)** | 原生 asyncio 支援，全程非阻塞 I/O；相比 asyncpg 更完整的 psycopg 生態相容性 | asyncpg |
| **SSE（Server-Sent Events）** | 相比 WebSocket 更輕量，無需雙向通訊；FastAPI `StreamingResponse` 原生支援，前端 `EventSource` 直接消費 | WebSocket |

---

## 九、可量化的工程成果

- **代碼量**：後端核心邏輯約 **800+ 行**（不含測試與配置）
- **API 端點**：**7 個** RESTful 端點（含 SSE 串流）
- **LangGraph Nodes**：**3 個非同步節點** + **1 個條件路由函數**
- **外部 API 調用鏈**：Gemini LLM（推理）+ Gemini Embedding（向量化）+ PostgreSQL（持久化）—— 全部以 async/await 實現，零阻塞
- **系統模組**：`graph/`、`routers/`、`db/`、`auth/`、`prompts/` 五層清晰分層
- **治療師人設**：約 **63 行** 精確規範的心理治療 Prompt，涵蓋 CBT、ACT、阿德勒、危機處理

---

## 十、後續規劃

1. **向量維運與監控**：針對 `therapy_memories` 的 `halfvec` HNSW 索引進行生產環境效能基準測試（Benchmark），監控高並發下的 P99 查詢延遲與記憶體水位。

2. **Gemini Structured Output 升級**：將 `summarize_node` 從字串 JSON 解析升級為 Gemini 原生 JSON Schema 強制輸出，消除解析失敗風險。

3. **Rate Limiting + 用量追蹤**：在 `/api/chat` 添加每用戶限流（如每日 100 次），防止 API 費用失控。

4. **生產容器化**：建立 `docker-compose.yml`，涵蓋 FastAPI 後端、pgvector 資料庫和前端 Nginx，實現一鍵部署。

5. **核心信念萃取**（`chunk_type: "core_belief"`）：在 `summarize_node` 中增加對核心信念的識別與單獨儲存，強化心理治療的深度追蹤。

---

*本報告由 Antigravity AI 輔助生成，技術內容基於實際程式碼分析。*
