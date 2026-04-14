"""
config.py — Centralised application settings for DataVal.ai
============================================================
All runtime-configurable values live here. They are loaded once at startup
from environment variables (and an optional .env file via python-dotenv).

Usage anywhere in the project:
    from config import settings
    print(settings.SECRET_KEY)
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Pydantic v2 BaseSettings — reads from environment variables and
    optionally from a .env file (loaded automatically when present).
    """

    # ── Security ──────────────────────────────────────────────────────────────
    # REQUIRED in production. Generate a safe value with:
    #   python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str = "CHANGE-ME-generate-a-real-secret-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ── Database ──────────────────────────────────────────────────────────────
    # PostgreSQL in production:  postgresql://user:pass@host:5432/dbname
    # Omit (or set empty) to fall back to SQLite for local development.
    DATABASE_URL: str = ""

    # ── CORS / Frontend ───────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173,http://127.0.0.1:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # ── OAuth2 — Google ───────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # ── OAuth2 — GitHub ───────────────────────────────────────────────────────
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # ── Thread-pool ───────────────────────────────────────────────────────────
    WORKER_THREADS: int = 4

    # ── PostgreSQL connection-pool tuning (ignored for SQLite) ────────────────
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30    # seconds to wait for a connection
    DB_POOL_RECYCLE: int = 1800  # recycle connections after 30 min

    # Pydantic v2 model config: look for a file called ".env" next to this module
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Derived helpers ───────────────────────────────────────────────────────
    @property
    def allowed_origins(self) -> List[str]:
        """Return FRONTEND_URL split on commas, stripped of whitespace."""
        return [o.strip() for o in self.FRONTEND_URL.split(",") if o.strip()]

    @property
    def effective_database_url(self) -> str:
        """
        Return the resolved DATABASE_URL:
        - If DATABASE_URL is set in the environment → use it (PostgreSQL).
        - Otherwise → fall back to a local SQLite file for development.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return "sqlite:///./dataval.db"

    @property
    def is_sqlite(self) -> bool:
        return self.effective_database_url.startswith("sqlite")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton Settings instance (cached after first call)."""
    return Settings()


# Convenience module-level instance — import this directly.
settings: Settings = get_settings()
