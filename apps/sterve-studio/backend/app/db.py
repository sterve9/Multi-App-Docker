"""SQLite history — simple, no ORM."""
import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.getenv("DB_PATH", "/data/studio.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id          TEXT PRIMARY KEY,
                type        TEXT NOT NULL,
                label       TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'processing',
                kie_task_id TEXT,
                result_urls TEXT,
                fail_msg    TEXT,
                meta        TEXT,
                created_at  TEXT NOT NULL
            )
        """)
        conn.commit()


def create_job(job_id: str, job_type: str, label: str, kie_task_id: str = None, meta: dict = None):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO jobs (id, type, label, status, kie_task_id, meta, created_at) VALUES (?,?,?,?,?,?,?)",
            (job_id, job_type, label, "processing", kie_task_id,
             json.dumps(meta or {}), datetime.utcnow().isoformat())
        )
        conn.commit()


def update_job(job_id: str, status: str, result_urls: list = None, fail_msg: str = None, kie_task_id: str = None):
    with get_conn() as conn:
        conn.execute(
            """UPDATE jobs SET status=?, result_urls=?, fail_msg=?, kie_task_id=COALESCE(?,kie_task_id)
               WHERE id=?""",
            (status, json.dumps(result_urls or []), fail_msg, kie_task_id, job_id)
        )
        conn.commit()


def get_job(job_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["result_urls"] = json.loads(d["result_urls"] or "[]")
        d["meta"] = json.loads(d["meta"] or "{}")
        return d


def list_jobs(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["result_urls"] = json.loads(d["result_urls"] or "[]")
            d["meta"] = json.loads(d["meta"] or "{}")
            result.append(d)
        return result


def delete_job(job_id: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM jobs WHERE id=?", (job_id,))
        conn.commit()
