"""
migrate_oauth_columns.py
━━━━━━━━━━━━━━━━━━━━━━━━
One-shot migration: adds the three OAuth columns that were introduced in the
social-login feature update to an existing `users` table.

Run once after pulling the feature branch:

    python migrate_oauth_columns.py

Safe to re-run — each ALTER TABLE is skipped if the column already exists.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "dataval.db")


def column_exists(cursor: sqlite3.Cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def migrate() -> None:
    if not os.path.exists(DB_PATH):
        print(f"[migrate] No database found at {DB_PATH} — nothing to do.")
        print("          (SQLAlchemy will create a fresh DB with all columns on next startup.)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    migrations = [
        # (column_name, DDL fragment)
        ("hashed_password_nullable", None),   # handled separately — SQLite can't change nullable
        ("oauth_provider",           "ALTER TABLE users ADD COLUMN oauth_provider TEXT"),
        ("oauth_id",                 "ALTER TABLE users ADD COLUMN oauth_id TEXT"),
    ]

    for col_name, ddl in migrations:
        if ddl is None:
            continue  # skip comment-only entries
        if column_exists(cur, "users", col_name):
            print(f"[migrate] Column '{col_name}' already exists — skipping.")
        else:
            cur.execute(ddl)
            print(f"[migrate] Added column '{col_name}'.")

    # Add an index on oauth_id for fast provider look-ups (IF NOT EXISTS is not
    # supported in older SQLite, so we catch the error if it already exists).
    try:
        cur.execute("CREATE INDEX idx_users_oauth_id ON users (oauth_id)")
        print("[migrate] Index 'idx_users_oauth_id' created.")
    except sqlite3.OperationalError as e:
        if "already exists" in str(e):
            print("[migrate] Index 'idx_users_oauth_id' already exists — skipping.")
        else:
            raise

    conn.commit()
    conn.close()
    print("[migrate] Migration complete.")


if __name__ == "__main__":
    migrate()
