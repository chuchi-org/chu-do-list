# ---------------------------------------------
#   db.py - code for database initialization
# ---------------------------------------------

import sqlite3
from pathlib import Path
from contextlib import contextmanager

# absolute path to tasks.db, located in the same folder as this file
# __file__ : Python's built-in reference to the current script's path
DB_PATH = Path(__file__).parent / "tasks.db"

# helper function to enable foreign key in each connection
def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON;")
    return connection

@contextmanager
def get_db():
    connection = get_connection()
    try:
        yield connection        # route's with block runs here
        connection.commit()     # block finished fine -> save changes
    except Exception:
        connection.rollback()   # block crashed -> undo half-finished changes
        raise                   # still let the error show up
    finally:
        connection.close()      # always runs, even on early return

def init_db():
    connection = get_connection()
    cursor  = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            display_name        TEXT,
            email               TEXT UNIQUE,
            password_hash       TEXT,
            reset_token         TEXT,
            reset_token_expiry  TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lists (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            name                TEXT NOT NULL,
            owner_id            INTEGER NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS list_members (
        list_id     INTEGER NOT NULL,
        user_id     INTEGER NOT NULL,
        role        TEXT DEFAULT 'collaborator',
        PRIMARY KEY (list_id, user_id),
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            title           TEXT,
            due_datetime    TEXT,
            priority        INTEGER,
            tag             TEXT,
            is_done         INTEGER,
            created_at      TEXT,
            user_id         INTEGER NOT NULL,
            is_personal     INTEGER NOT NULL DEFAULT 1 CHECK (is_personal IN (0, 1)),
            list_id         INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
            CHECK ((is_personal = 1 AND list_id IS NULL)
                    OR (is_personal = 0 AND list_id IS NOT NULL))
        )
    """)

    # guard; check if machine still has the old database and prompts them to delete tasks.db
    cursor.execute("PRAGMA table_info(tasks)")
    task_columns = [c[1] for c in cursor.fetchall()]
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [c[1] for c in cursor.fetchall()]
    if "is_personal" not in task_columns or "reset_token" not in user_columns:
        connection.close()
        raise SystemExit("Old tasks.db detected. Delete tasks.db and restart app.py")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_list_members_user_id ON list_members(user_id)")

    connection.commit()     # permanently saves all the pending changes made during the current transaction to the database file
    cursor.close()          # closes the opened Cursor
    connection.close()      # terminates the active link between Py script and SQLite DB