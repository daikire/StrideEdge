import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/

DB_PATH = str(BASE_DIR / "data" / "stride_edge.db")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
APP_TITLE = "StrideEdge API"
APP_VERSION = "0.1.0"
