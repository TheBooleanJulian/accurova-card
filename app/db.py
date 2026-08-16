from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from app.config import settings


def get_connection():
    return psycopg.connect(settings.DATABASE_URL, row_factory=dict_row, autocommit=False)


@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        yield conn.cursor()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with db_cursor() as cur:
        cur.execute(
            """CREATE TABLE IF NOT EXISTS pageview_events (
                id SERIAL PRIMARY KEY,
                event TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )"""
        )


def record_event(event: str) -> None:
    with db_cursor() as cur:
        cur.execute("INSERT INTO pageview_events (event) VALUES (%s)", (event,))


def get_stats() -> dict:
    windows = {"all_time": None, "last_7d": "7 days", "last_30d": "30 days"}
    result = {}
    with db_cursor() as cur:
        for key, interval in windows.items():
            if interval is None:
                cur.execute("SELECT event, count(*) AS n FROM pageview_events GROUP BY event")
            else:
                cur.execute(
                    "SELECT event, count(*) AS n FROM pageview_events "
                    "WHERE created_at > now() - %s::interval GROUP BY event",
                    (interval,),
                )
            result[key] = {row["event"]: row["n"] for row in cur.fetchall()}
    return result
