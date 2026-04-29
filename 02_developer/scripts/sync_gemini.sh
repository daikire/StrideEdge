#!/bin/bash
# GEMINI.md をローカル → Google Drive へ Word 形式で同期するスクリプト

SRC="/Users/Daiki/ClaudeCode/StrideEdge/Memory/GEMINI.md"
DST="/Users/Daiki/Library/CloudStorage/GoogleDrive-re.accelerator@gmail.com/マイドライブ/ClaudeCode/StrideEdge/GEMINI.docx"
CONVERT="/Users/Daiki/ClaudeCode/StrideEdge/scripts/md_to_docx.py"
PYTHON="/Users/Daiki/opt/anaconda3/bin/python3"

if [ ! -f "$SRC" ]; then
  echo "[ERROR] Source not found: $SRC" >&2
  exit 1
fi

"$PYTHON" "$CONVERT" "$SRC" "$DST" && \
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] GEMINI.md → GEMINI.docx synced to Google Drive"
