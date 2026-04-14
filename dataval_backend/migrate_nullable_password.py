"""
migrate_nullable_password.py
============================
One-shot SQLite migration: make `users.hashed_password` nullable.

SQLite does NOT support DROP COLUMN / ALTER COLUMN, so the standard
approach is:
  1. Create a new table with the correct schema
  2. Copy all existing data
  3. Drop the old table
  4. Rename the new table

Run once from the project root:
    python migrate_nullable_password.py

Safe to re-run: it checks whether the column is already nullable first.
"""

import sqlite3
import sys
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "dataval.db")


def column_is_nullable(conn: sqlite3.Connection, table: str, column: str) -> bool:
    """Return True if the column already allows NULLs."""
    cursor = conn.execute(f"PRAGMA table_info({table})")
    for row in cursor.fetchall():
        # row: (cid, name, type, notnull, dflt_value, pk)
        if row[1] == column:
            return row[3] == 0  # notnull==0 means nullable
    raise ValueError(f"Column '{column}' not found in table '{table}'")


def migrate(db_path: str) -> None:
    if not os.path.exists(db_path):
        print(f"ERROR: Database file not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")  # safer for concurrent access
    conn.execute("PRAGMA foreign_keys=OFF")  # required during table rebuild

    try:
        with conn:  # auto-commits on success, rolls back on exception
            if column_is_nullable(conn, "users", "hashed_password"):
                print("✅  hashed_password is already nullable — nothing to do.")
                return

            print("🔄  Migrating users table …")

            # 1. Create new table with hashed_password nullable
            conn.execute("""
                CREATE TABLE users_new (
                    id                  TEXT    PRIMARY KEY,
                    full_name           TEXT    NOT NULL,
                    email               TEXT    NOT NULL UNIQUE,
                    hashed_password     TEXT,               -- nullable ← the fix
                    organization        TEXT    DEFAULT '',
                    profile_picture_url TEXT    DEFAULT NULL,
                    oauth_provider      TEXT    DEFAULT NULL,
                    oauth_id            TEXT    DEFAULT NULL
                )
            """)

            # 2. Copy all rows
            conn.execute("""
                INSERT INTO users_new
                    (id, full_name, email, hashed_password, organization,
                     profile_picture_url, oauth_provider, oauth_id)
                SELECT
                    id, full_name, email, hashed_password, organization,
                    profile_picture_url, oauth_provider, oauth_id
                FROM users
            """)

            # 3. Drop old table
            conn.execute("DROP TABLE users")

            # 4. Rename
            conn.execute("ALTER TABLE users_new RENAME TO users")

            # 5. Re-create indexes that SQLAlchemy would normally create
            conn.execute("CREATE INDEX IF NOT EXISTS ix_users_email   ON users(email)")
            conn.execute("CREATE INDEX IF NOT EXISTS ix_users_oauth_id ON users(oauth_id)")

        print("✅  Migration complete — hashed_password is now nullable.")

        # Verify
        conn.execute("PRAGMA foreign_keys=ON")
        if column_is_nullable(conn, "users", "hashed_password"):
            print("✅  Verification passed.")
        else:
            print("❌  Verification FAILED — column is still NOT NULL!", file=sys.stderr)
            sys.exit(1)

    except Exception as exc:
        print(f"❌  Migration failed: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    migrate(DB_PATH)
