# ------------------------------------------------------
#   constants.py - drawer for shared constant variables
# ------------------------------------------------------

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "tasks.db"

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

DEFAULT_PRIORITY = 1