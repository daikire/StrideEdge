#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== StrideEdge バックエンド起動 ==="
pip install -r requirements.txt -q
python -m app.database.init_db
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
