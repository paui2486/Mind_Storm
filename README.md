# 🧠 Mind Storm (Sanctuary) — AI 心理治療師系統

具備**跨會話長期記憶 (Long-Term Memory)**、**高隱私多租戶隔離**與**沉浸式語音互動**的 AI 心理治療師系統。  
系統融合**認知行為療法 (CBT)**、**接納與承諾療法 (ACT)** 與**阿德勒心理學 (Adlerian Psychology)**，透過 LangGraph 狀態機與 PostgreSQL (`pgvector`) 雙軌記憶架構，提供安全、非評判且具脈絡連貫性的心理支持空間。

---

## ✨ 核心特色

- **🔄 雙軌記憶架構 (Dual-Track Memory)**
  - **短期記憶 (Working & Short-Term Memory)**：採用 LangGraph `AsyncPostgresSaver` Checkpointer，以使用者唯一識別碼 (`UID`) 作為 `thread_id`，持久化對話狀態與滾動式摘要。
  - **長期記憶 (Long-Term Semantic Memory)**：採用 `pgvector` 儲存 3072 維語意向量 (`HALFVEC(3072)`) 與結構化情緒指標 (`topics`, `intensity`)，搭配 **HNSW (`halfvec_cosine_ops`)** 索引實現高效 Hybrid Search。
- **🧩 LangGraph 狀態機與自動上下文壓縮**
  - 透過條件路由 (`should_summarize`) 監控對話長度，當對話達閾值（預設 10 輪）時自動觸發 `SummarizeNode`，在單次 LLM 調用中同時更新滾動摘要、萃取主題標籤與情緒強度（1–10 分），並透過 `RemoveMessage` 釋放 Context Window。
- **⚡ 即時串流與狀態回溯 (Time-Travel Editing)**
  - 支援 **SSE (Server-Sent Events)** 逐字串流輸出 (`stream_mode="messages"`)。
  - 支援**編輯最後一則訊息**：透過 LangGraph `aget_state` 與 `aupdate_state` 抹除上一輪問答狀態並即時重新推論。
- **🎙️ 多模態體驗與視覺化洞察**
  - **沉浸式語音模式 (Voice Mode)**：支援語音輸入與語音合成播放，可自訂語速、音調與語音偏好。
  - **情緒日誌與分析圖表 (Journal & Analytics)**：自動將長期記憶轉化為視覺化情緒曲線、主題分佈與歷程回顧。
  - **原子化記憶重置**：提供一鍵清除所有長期向量記憶與短期 Checkpoints 的完整隱私控制權。
- **🛡️ 嚴謹的治療師人設與危機處理協議**
  - 嚴格遵守「每次回應結尾最多 1 個問句」的蘇格拉底式引導鐵律，結合華人文化敏感度。
  - 內建自我傷害偵測與危機處理協議，即時中斷常規探索並提供台灣在地專業求助專線（1925、1995、1980）。

---

## 🏗️ 系統架構與 LangGraph 流程

```mermaid
flowchart TD
    User(["👤 使用者 (Web / Voice Mode)"]) -->|"POST /api/chat (Bearer Token / UID)"| Auth["🔐 Google OAuth2 驗證層 (verify_google_token)"]
    Auth -->|"thread_id = UID"| START((START))

    subgraph LangGraph ["LangGraph StateGraph (TherapyState)"]
        START --> Retrieve["🔍 Retrieve Node<br/>Gemini Embedding (3072d)<br/>pgvector Hybrid Search (WHERE user_id = UID)"]
        Retrieve --> Chat["💬 Chat Node<br/>4 層 Prompt 組裝<br/>Gemini 3.8 Flash (Thinking Mode)"]
        Chat --> Edge{"🔀 should_summarize<br/>messages >= 10?"}
        Edge -->|"未達閾值"| END_NODE((END))
        Edge -->|"達到閾值"| Summarize["📝 Summarize Node<br/>滾動摘要更新 + JSON Metadata 萃取<br/>RemoveMessage 清理舊對話"]
        Summarize --> END_NODE
    end

    subgraph Database ["PostgreSQL 16 + pgvector (AsyncConnectionPool)"]
        Checkpointer[("💾 Checkpoints 表<br/>(AsyncPostgresSaver 短期記憶)")]
        VectorDB[("🧠 therapy_memories 表<br/>(HALFVEC(3072) + HNSW 索引)")]
    end

    Retrieve <-->|"餘弦相似度 Top-3"| VectorDB
    Summarize -->|"寫入摘要向量 + topics + intensity"| VectorDB
    LangGraph <-->|"持久化狀態"| Checkpointer
```

---

## 🛠️ 技術棧 (Tech Stack)

| 層級 | 技術選型 | 說明 |
| :--- | :--- | :--- |
| **後端框架** | **FastAPI** + Uvicorn | 非同步 REST API、SSE 串流、Lifespan 連線池管理 |
| **Agent 編排** | **LangGraph** (`StateGraph`) | 狀態管理、條件路由、Checkpoint 時間回溯 |
| **大語言模型** | **Gemini 3.8 Flash** | 啟用 `thinking_level: medium`，兼顧同理心推演與低延遲 |
| **向量模型** | **Gemini Embedding 001** | `models/gemini-embedding-001` (3072 維度輸出) |
| **資料庫** | **PostgreSQL 16 + pgvector** | 統一負責短期狀態 (`PostgresSaver`) 與長期向量 (`HALFVEC` HNSW) |
| **DB 驅動** | **psycopg 3** (`AsyncConnectionPool`) | 全程非同步連線池複用，零阻塞 I/O |
| **身分驗證** | **Google OAuth2** (`google-auth`) | 支援生產環境 `id_token` 驗證與開發環境 `dev_uid` 快速切換 |
| **前端框架** | **Vite** + Vanilla JS / CSS | 響應式介面、SSE 串流渲染、語音互動模式、情緒圖表 |

---

## 📂 專案目錄結構

```text
Mind_Storm/
├── backend/
│   ├── main.py                  # FastAPI 應用程式入口與 Lifespan 管理
│   ├── config.py                # Pydantic Settings 環境變數設定
│   ├── requirements.txt         # Python 依賴套件清單
│   ├── db/
│   │   ├── database.py          # psycopg3 AsyncConnectionPool 管理
│   │   ├── init_db.py           # 資料庫 Schema 與索引自動初始化
│   │   └── schema.sql           # therapy_memories 資料表與 halfvec HNSW 索引定義
│   ├── graph/
│   │   ├── state.py             # TherapyState (messages, summary, retrieved_context, user_id)
│   │   ├── nodes.py             # retrieve_node, chat_node, summarize_node 實作
│   │   ├── edges.py             # should_summarize 條件路由邏輯
│   │   └── graph_builder.py     # StateGraph 編譯、SSE 串流與編輯回溯邏輯
│   ├── prompts/
│   │   ├── therapist_persona.py # CBT/ACT/阿德勒心理治療師系統提示詞
│   │   └── summarize_prompt.py  # 滾動摘要與 Metadata (topics, intensity) 提取提示詞
│   └── routers/
│       ├── auth.py              # Google OAuth2 與開發模式雙軌驗證
│       ├── chat.py              # /api/chat (SSE), /api/chat/edit, /api/chat/history
│       ├── journal.py           # /api/journal 情緒日誌查詢
│       └── settings.py          # /api/settings/memory 原子化記憶清除
├── front/                       # 前端原始碼 (Vite)
│   ├── src/
│   │   ├── main.js              # 前端路由與狀態管理
│   │   ├── api.js               # 後端 API 與 SSE 串流封裝
│   │   └── pages/               # Chat, Voice, Journal, Settings, Login 頁面元件
│   └── package.json
├── AI 心理治療師系統開發計畫書.txt # 系統規格與架構設計文件
├── 心理治療師人設.md             # 治療師角色設定與危機處理規範
├── Mind_Storm工作實績報告.md     # 技術架構深度解析與實績報告
└── TROUBLESHOOTING.md           # 常見開發環境除錯指南
```

---

## 🚀 快速開始 (Getting Started)

### 1. 啟動 PostgreSQL (`pgvector`) 資料庫

請確保本機已安裝 Docker，並執行以下指令啟動支援 `pgvector` 的 PostgreSQL 16 容器：

```bash
docker run --name pgvector-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d pgvector/pgvector:pg16
```

### 2. 設定後端環境與安裝依賴

在 `backend/` 目錄下建立 `.env` 檔案：

```env
# 必填：Google AI Studio API Key
GOOGLE_API_KEY=your_gemini_api_key_here

# 選填：Google OAuth2 Client ID（留空則自動啟用開發模式，可使用任意 dev_uid 登入）
GOOGLE_CLIENT_ID=

# PostgreSQL 連線字串
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres

# 觸發 Summarize Node 的訊息數量閾值
SUMMARIZE_THRESHOLD=10

# 模型設定
LLM_MODEL=gemini-3.8-flash
EMBEDDING_MODEL=models/gemini-embedding-001
```

安裝 Python 套件並啟動後端伺服器（啟動時會自動建立資料表、Checkpointer 與 HNSW 索引）：

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 啟動 FastAPI 服務 (預設監聽 http://0.0.0.0:8001)
python main.py
```

### 3. 啟動或編譯前端

**開發模式（Hot Reload）：**

```bash
cd front
npm install
npx vite --host 127.0.0.1 --port 5173
```

**生產模式（由 FastAPI 直接託管靜態檔案）：**

```bash
cd front
npm install
npm run build
# 編譯完成後直接訪問 http://127.0.0.1:8001 即可使用完整前綴與介面
```

---

## 🔌 API 端點總覽

| 方法 | 路徑 | 說明 | 認證方式 |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/google` | 驗證 Google `id_token` 或開發模式 `dev_uid` | 無（登入端點） |
| `POST` | `/api/chat` | 發送對話訊息並接收 **SSE 串流**回應 | `Bearer Token` / `X-Dev-UID` |
| `PUT` | `/api/chat/edit` | 編輯最後一則使用者訊息，回溯狀態並重新串流推論 | `Bearer Token` / `X-Dev-UID` |
| `GET` | `/api/chat/history` | 取得當前使用者的短期對話歷史紀錄 | `Bearer Token` / `X-Dev-UID` |
| `GET` | `/api/journal` | 取得當前使用者的長期記憶摘要、主題標籤與情緒強度 | `Bearer Token` / `X-Dev-UID` |
| `DELETE` | `/api/settings/memory` | 原子化清除該使用者的所有長期記憶與短期 Checkpoints | `Bearer Token` / `X-Dev-UID` |
| `GET` | `/health` | 系統健康檢查端點 | 無 |

---

## 🛡️ 免責聲明 (Disclaimer)

本系統由 AI 大型語言模型驅動，旨在提供日常情緒支持、自我探索引導與心理韌性練習，**並非醫療器材，亦無法取代專業精神科醫師診斷或實體心理諮商**。若您正經歷嚴重的心理危機或有自我傷害意念，請立即撥打台灣衛福部安心專線 **1925**（24 小時免付費）、生命線 **1995** 或張老師專線 **1980**。
