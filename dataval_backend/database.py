"""
database.py — SQLAlchemy engine & session factory for DataVal.ai
================================================================
Supports both PostgreSQL (production) and SQLite (local dev fallback).
The active database is chosen via the DATABASE_URL environment variable:

  • DATABASE_URL set → use PostgreSQL with production-grade pool settings.
  • DATABASE_URL not set / empty → fall back to SQLite (local dev only).
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from config import settings

# ── Engine construction ───────────────────────────────────────────────────────

if settings.is_sqlite:
    # SQLite: no connection pool; check_same_thread needed for FastAPI's
    # multi-threaded request handling.
    engine = create_engine(
        settings.effective_database_url,
        connect_args={"check_same_thread": False},
        # pool_pre_ping validates connections before handing them out
        pool_pre_ping=True,
    )
else:
    # PostgreSQL: use QueuePool with production-grade settings.
    # All values are configurable via environment variables (see config.py).
    engine = create_engine(
        settings.effective_database_url,
        pool_size=settings.DB_POOL_SIZE,          # resident connections kept open
        max_overflow=settings.DB_MAX_OVERFLOW,    # extra connections allowed under load
        pool_timeout=settings.DB_POOL_TIMEOUT,    # seconds to wait for a free slot
        pool_recycle=settings.DB_POOL_RECYCLE,    # recycle stale connections (avoids timeouts)
        pool_pre_ping=True,                       # test connection health before use
        # echo=True,  # uncomment to log all SQL statements (useful while debugging)
    )

# ── Session factory ───────────────────────────────────────────────────────────

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ── Declarative base (shared by all models) ───────────────────────────────────

Base = declarative_base()


# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_db():
    """
    Yield a database session and guarantee it is closed after the request,
    even if an exception is raised inside the route handler.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
