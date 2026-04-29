#!/bin/bash
# StrideEdge バックグラウンド起動スクリプト（.app 用）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
mkdir -p "$PROJECT_ROOT/logs"

PYTHON=/Users/Daiki/opt/anaconda3/bin/python3
NODE_BIN=/Users/Daiki/.nvm/versions/node/v24.15.0/bin
NPM="$NODE_BIN/npm"
LOCK_FILE="/tmp/strideedge_launcher.lock"
LOG="$PROJECT_ROOT/logs/startup.log"

# nvm node を PATH に追加（.app は shell 環境を引き継がないため必須）
# npm・next など #!/usr/bin/env node で呼ばれるすべてのバイナリが解決できるようになる
export PATH="$NODE_BIN:$PATH"

# ── クリーンアップ・シーケンス ──────────────────────────────────────
# ポートが使用中の場合のみ旧プロセスを強制終了する
# ※ ロックファイルは Swift ランチャーが起動前に生成するため条件に含めない
PORT_PIDS_8000=$(lsof -ti TCP:8000 2>/dev/null)
PORT_PIDS_3000=$(lsof -ti TCP:3000 2>/dev/null)

if [ -n "$PORT_PIDS_8000" ] || [ -n "$PORT_PIDS_3000" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] クリーンアップ実行: 旧プロセス強制終了" >> "$LOG"

    # ポート占有プロセスを kill -9
    [ -n "$PORT_PIDS_8000" ] && echo "$PORT_PIDS_8000" | xargs kill -9 2>/dev/null
    [ -n "$PORT_PIDS_3000" ] && echo "$PORT_PIDS_3000" | xargs kill -9 2>/dev/null

    # ロックファイル削除（stale プロセスがあった = ロックも stale の可能性あり）
    rm -f "$LOCK_FILE" 2>/dev/null

    sleep 1
fi

# DB 初期化
cd "$PROJECT_ROOT/backend"
$PYTHON -m app.database.init_db > "$PROJECT_ROOT/logs/init.log" 2>&1

# ── バックエンド起動 ──────────────────────────────────────────────
# os.setsid() で新しいセッションを作成し、起動元のプロセスグループから完全に独立させる
# これにより shutdown 時の killpg でテスト・デバッグスクリプトが巻き込まれなくなる
$PYTHON - << PYEOF
import subprocess, os, sys

def new_session():
    os.setsid()

p = subprocess.Popen(
    [
        "$PYTHON", "-m", "uvicorn", "app.main:app",
        "--port", "8000", "--host", "0.0.0.0"
    ],
    preexec_fn=new_session,
    stdout=open("$PROJECT_ROOT/logs/backend.log", "w"),
    stderr=subprocess.STDOUT,
    cwd="$PROJECT_ROOT/backend"
)
with open("$PROJECT_ROOT/logs/backend.pid", "w") as f:
    f.write(str(p.pid))
PYEOF

# ── フロントエンド起動 ────────────────────────────────────────────
$PYTHON - << PYEOF
import subprocess, os

def new_session():
    os.setsid()

p = subprocess.Popen(
    ["$NPM", "run", "dev"],
    preexec_fn=new_session,
    stdout=open("$PROJECT_ROOT/logs/frontend.log", "w"),
    stderr=subprocess.STDOUT,
    cwd="$PROJECT_ROOT/frontend",
    env={**os.environ, "PATH": "$NODE_BIN:" + os.environ.get("PATH", "")}
)
with open("$PROJECT_ROOT/logs/frontend.pid", "w") as f:
    f.write(str(p.pid))
PYEOF
