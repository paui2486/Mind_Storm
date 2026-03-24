-- schema.sql - therapy_memories 資料表與索引初始化
-- 用於 AI 心理治療師系統的長期記憶儲存

-- 啟用 pgvector 擴充
CREATE EXTENSION IF NOT EXISTS vector;

-- 長期記憶主表
CREATE TABLE IF NOT EXISTS therapy_memories (
    id          BIGSERIAL PRIMARY KEY,
    user_id     VARCHAR(255) NOT NULL,               -- Google UID (記憶隔離 Key)
    content     TEXT NOT NULL,                        -- 壓縮後的語意片段或洞見
    embedding   VECTOR(3072),                         -- gemini-embedding-001 輸出維度
    topics      TEXT[],                               -- 主題標籤 e.g. ['職涯焦慮', '完美主義']
    intensity   INTEGER CHECK (intensity BETWEEN 1 AND 10),  -- 情緒強度 1-10
    chunk_type  VARCHAR(50) DEFAULT 'summary',        -- 'summary' | 'core_belief'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 使用者 ID 索引 (加速 Hybrid Search 的 WHERE user_id = $1 過濾)
CREATE INDEX IF NOT EXISTS therapy_memories_user_idx
    ON therapy_memories (user_id);

-- 時間索引 (便於按時間排序查詢)
CREATE INDEX IF NOT EXISTS therapy_memories_created_idx
    ON therapy_memories (created_at DESC);
