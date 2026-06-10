"""
Database initialization and connection management using SQLite.
"""

import sqlite3
import os
from datetime import datetime

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "interviews.db")


def get_db_connection():
    """Create and return a database connection with row factory."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interviews (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            role        TEXT    NOT NULL,
            experience  TEXT    NOT NULL,
            skills      TEXT    NOT NULL,
            difficulty  TEXT    NOT NULL,
            category    TEXT    NOT NULL DEFAULT 'mixed',
            num_questions INTEGER NOT NULL DEFAULT 10,
            questions   TEXT    NOT NULL,
            created_at  TEXT    NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Database initialized successfully.")


def save_interview(role, experience, skills, difficulty, category, num_questions, questions_json):
    """Persist a generated interview to the database and return its id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    cursor.execute(
        """
        INSERT INTO interviews (role, experience, skills, difficulty, category, num_questions, questions, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (role, experience, skills, difficulty, category, num_questions, questions_json, now),
    )
    conn.commit()
    interview_id = cursor.lastrowid
    conn.close()
    return interview_id


def get_all_interviews():
    """Return a list of all interviews ordered by most recent."""
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT id, role, experience, skills, difficulty, category, num_questions, created_at FROM interviews ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_interview_by_id(interview_id):
    """Return a single interview by id including questions JSON."""
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM interviews WHERE id = ?", (interview_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def delete_interview(interview_id):
    """Delete an interview by id. Returns True if deleted."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM interviews WHERE id = ?", (interview_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0
