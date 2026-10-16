"""
config.py - 全域設定，透過 pydantic-settings 讀取 .env
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

_BACKEND_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    # Google AI (Gemini + Embeddings)
    google_api_key: str

    # Google OAuth2 (留空則進入開發模式)
    google_client_id: str = ""

    # PostgreSQL
    database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"

    # LangGraph - Summarize 觸發閾值
    summarize_threshold: int = 10

    # Gemini 模型
    llm_model: str = "gemini-3.8-flash"
    embedding_model: str = "models/gemini-embedding-001"

    # Frontend static files (Vite build output)
    frontend_dir: str = str(_BACKEND_DIR.parent / "front" / "dist")

    model_config = SettingsConfigDict(
        env_file=(str(_BACKEND_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
