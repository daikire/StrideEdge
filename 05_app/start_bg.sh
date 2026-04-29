#!/bin/bash
# StrideEdge バックグラウンド起動スクリプト（.app 用）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
mkdir -p "$PROJECT_ROOT/logs"

# .app はログインシェル環境を引き継がないため明示的にロード
source ~/.zshrc 2>/dev/null || source ~/.bash_profile 2>/dev/null
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -f "$HOME/opt/anaconda3/etc/profile.d/conda.sh" ] && source "$HOME/opt/anaconda3/etc/profile.d/conda.sh"
[ -f "$HOME/anaconda3/etc/profile.d/conda.sh" ] && source "$HOME/anaconda3/etc/profile.d/conda.sh"
[ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ] && source "$HOME/miniconda3/etc/profile.d/conda.sh"

# Python 動的検出
PYTHON=""
for _p in \
    "$(which python3 2>/dev/null)" \
    "$HOME/opt/anaconda3/bin/python3" \
    "$HOME/anaconda3/bin/python3" \
    "$HOME/miniconda3/bin/python3"; do
    [ -x "$_p" ] && PYTHON="$_p" && break
done
if [ -z "$PYTHON" ]; then
    echo "[ERROR] python3 が見つかりません" >&2; exit 1
fi

# Node 動的検出
NODE_BIN=""
if command -v node &>/dev/null; then
    NODE_BIN="$(dirname "$(command -v node)")"
else
    # nvm インストール済み最新バージョンを使用
    NODE_BIN=$(ls -d "$HOME/.nvm/versions/node"/*/bin 2>/dev/null | sort -V | tail -1)
fi
if [ -z "$NODE_BIN" ]; then
    echo "[ERROR] node が見つかりません" >&2; exit 1
fi
NPM="$NODE_BIN/npm"
LOCK_FILE="/tmp/strideedge_launcher.lock"
LOG="$PROJECT_ROOT/logs/startup.log"

_log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"; }

# nvm node を PATH に追加（.app は shell 環境を引き継がないため必須）
export PATH="$NODE_BIN:$PATH"

_log "=== start_bg.sh 開始 (PID=$$, PYTHON=$PYTHON, NODE=$NODE_BIN) ==="

# ── クリーンアップ・シーケンス ──────────────────────────────────────
PORT_PIDS_8000=$(lsof -ti TCP:8000 2>/dev/null)
PORT_PIDS_3000=$(lsof -ti TCP:3000 2>/dev/null)

if [ -n "$PORT_PIDS_8000" ] || [ -n "$PORT_PIDS_3000" ]; then
    _log "クリーンアップ: 旧プロセス強制終了 (port8000=$PORT_PIDS_8000 port3000=$PORT_PIDS_3000)"
    [ -n "$PORT_PIDS_8000" ] && echo "$PORT_PIDS_8000" | xargs kill -9 2>/dev/null
    [ -n "$PORT_PIDS_3000" ] && echo "$PORT_PIDS_3000" | xargs kill -9 2>/dev/null
    rm -f "$LOCK_FILE" 2>/dev/null
    sleep 1
    _log "クリーンアップ完了"
fi

# DB 初期化
_log "DB初期化開始"
cd "$PROJECT_ROOT/backend"
$PYTHON -m app.database.init_db > "$PROJECT_ROOT/logs/init.log" 2>&1
DB_EXIT=$?
_log "DB初期化完了 (exit=$DB_EXIT)"

# ── バックエンド起動 ──────────────────────────────────────────────
_log "バックエンド起動中..."
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
print(f"backend PID={p.pid}")
PYEOF
_log "バックエンド起動完了 (PID=$(cat "$PROJECT_ROOT/logs/backend.pid" 2>/dev/null))"

# ── フロントエンド起動 ────────────────────────────────────────────
_log "フロントエンド起動中..."
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
print(f"frontend PID={p.pid}")
PYEOF
_log "フロントエンド起動完了 (PID=$(cat "$PROJECT_ROOT/logs/frontend.pid" 2>/dev/null))"
_log "=== start_bg.sh 終了 ==="
