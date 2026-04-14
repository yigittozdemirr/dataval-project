"""
models.py — SQLAlchemy ORM models for DataVal.ai
=================================================
Defines the database schema.  Uses String primary keys (UUIDs) which are
compatible with both SQLite (dev) and PostgreSQL (production).

For PostgreSQL, consider migrating to native UUID columns in the future:
    from sqlalchemy.dialects.postgresql import UUID
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
This is deferred to avoid breaking the SQLite fallback path.
"""

import uuid
from sqlalchemy import Column, String

from database import Base


def _new_uuid() -> str:
    """Generate a new UUID4 string — used as the default PK generator."""
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    # String UUIDs work on both SQLite and PostgreSQL
    id                  = Column(String(36),  primary_key=True, default=_new_uuid)
    full_name           = Column(String(255),  nullable=False)
    email               = Column(String(255),  unique=True, index=True, nullable=False)
    hashed_password     = Column(String(255),  nullable=True)   # NULL for social-only accounts
    organization        = Column(String(255),  nullable=True, default="")
    profile_picture_url = Column(String(512),  nullable=True, default=None)

    # ── OAuth / Social login ──────────────────────────────────────────────────
    # provider: "google" | "github" | None (email/password)
    oauth_provider      = Column(String(32),   nullable=True, default=None)
    oauth_id            = Column(String(128),  nullable=True, default=None, index=True)
