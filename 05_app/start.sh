#!/bin/bash
# set -e は使わない（パッケージインストールの警告で止まらないように）

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ログインシェル環境をロード（ターミナル以外から起動された場合の PATH 対策）
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
    echo "エラー: python3 が見つかりません。"; exit 1
fi

# logsディレクトリを作成（なければ）
mkdir -p "$SCRIPT_DIR/logs"

echo "=== StrideEdge 起動中 ==="

# ---- バックエンド起動 ----
echo "[1/4] Python依存パッケージをインストール中..."
cd "$SCRIPT_DIR/backend"
"$PYTHON" -m pip install -r requirements.txt -q 2>&1 | grep -v "already satisfied" || true
echo "     完了"

echo "[2/4] DBを初期化中..."
"$PYTHON" -m app.database.init_db
echo "     完了"

echo "[3/4] バックエンド起動中..."
"$PYTHON" -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0 > "$SCRIPT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# バックエンドのヘルスチェック（最大30秒）
echo "     バックエンド応答待ち..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/api/races > /dev/null 2>&1; then
    echo "     バックエンド起動完了 (${i}秒)"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "エラー: バックエンドが起動しませんでした。logs/backend.log を確認してください。"
    tail -20 "$SCRIPT_DIR/logs/backend.log"
    exit 1
  fi
  sleep 1
done

# ---- フロントエンド起動 ----
echo "[4/4] フロントエンド起動中..."
cd "$SCRIPT_DIR/frontend"
npm install -q 2>&1 | tail -3 || true
npm run dev > "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

# フロントエンドのヘルスチェック（最大60秒）
echo "     フロントエンド応答待ち（初回は30秒程度かかります）..."
for i in $(seq 1 60); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "     フロントエンド起動完了 (${i}秒)"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "エラー: フロントエンドが起動しませんでした。logs/frontend.log を確認してください。"
    tail -20 "$SCRIPT_DIR/logs/frontend.log"
    exit 1
  fi
  sleep 1
done

echo ""
echo "========================================="
echo "  StrideEdge 起動完了"
echo "========================================="
echo "  フロントエンド : http://localhost:3000"
echo "  バックエンドAPI: http://localhost:8000"
echo "  APIドキュメント : http://localhost:8000/docs"
echo "  停止するには Ctrl+C を押してください"
echo "========================================="

# ブラウザを自動オープン（macOS）
open http://localhost:3000

trap "echo '停止中...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '停止完了'" EXIT INT TERM
wait
