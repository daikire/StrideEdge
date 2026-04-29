#!/bin/bash
# StrideEdge .app リビルドスクリプト（AppleScript + Shell 方式）
# Swift コンパイル不要。環境依存のない堅牢な起動を実現する。

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="StrideEdge"
OUT_APP="$SCRIPT_DIR/${APP_NAME}.app"
DESKTOP_APP="$HOME/Desktop/${APP_NAME}.app"

echo "=== StrideEdge .app ビルド開始（AppleScript方式）==="

# ---- [0/4] アイコン生成 ----
echo "[0/4] アイコンを生成中..."
ICON_DIR="$SCRIPT_DIR/icon.iconset"
CUSTOM_ICON="$SCRIPT_DIR/icon.png"
mkdir -p "$ICON_DIR"

if [ -f "$CUSTOM_ICON" ]; then
  echo "      カスタムアイコン検出: $CUSTOM_ICON"
  for size in 16 32 64 128 256 512 1024; do
    sips -z "$size" "$size" "$CUSTOM_ICON" --out "$ICON_DIR/icon_${size}x${size}.png" > /dev/null 2>&1
  done
  for size in 16 32 64 128 256 512; do
    double=$((size * 2))
    sips -z "$double" "$double" "$CUSTOM_ICON" --out "$ICON_DIR/icon_${size}x${size}@2x.png" > /dev/null 2>&1
  done
else
  echo "      icon.png 未検出。投資端末アイコン（金色の S）を生成..."
  python3 -c "
import os, struct, zlib, math

icon_dir = '$ICON_DIR'

def write_png(path, size):
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)
    BG    = (4, 8, 12)
    RING  = (212, 168, 67)
    INNER = (8, 15, 20)
    GOLD  = (212, 168, 67)
    cx, cy = size / 2.0, size / 2.0
    r = size * 0.46
    ring_inner = r * 0.90
    sw   = size * 0.26
    sh   = size * 0.50
    sx   = cx - sw / 2.0
    sy   = cy - sh / 2.0
    bar  = max(2.0, size * 0.065)
    segs = [
        (sx, sy, sx + sw, sy + bar),
        (sx, cy - bar/2, sx + sw, cy + bar/2),
        (sx, sy + sh - bar, sx + sw, sy + sh),
        (sx, sy + bar, sx + bar, cy - bar/2),
        (sx + sw - bar, cy + bar/2, sx + sw, sy + sh - bar),
    ]
    rows = []
    for y in range(size):
        row = b'\x00'
        for x in range(size):
            dx, dy = x - cx, y - cy
            d = math.sqrt(dx*dx + dy*dy)
            if d > r:
                row += bytes(BG + (255,))
            elif d > ring_inner:
                t = (d - ring_inner) / (r - ring_inner)
                p = tuple(int(RING[i] + (BG[i] - RING[i]) * t) for i in range(3))
                row += bytes(p + (255,))
            elif any(x1 <= x <= x2 and y1 <= y <= y2 for x1,y1,x2,y2 in segs):
                row += bytes(GOLD + (255,))
            else:
                row += bytes(INNER + (255,))
        rows.append(row)
    raw = b''.join(rows)
    sig  = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

os.makedirs(icon_dir, exist_ok=True)
for s in [16, 32, 64, 128, 256, 512, 1024]:
    write_png(os.path.join(icon_dir, f'icon_{s}x{s}.png'), s)
    if s <= 512:
        write_png(os.path.join(icon_dir, f'icon_{s}x{s}@2x.png'), s*2)
print('      投資端末アイコン（金色 S）生成完了')
"
fi

iconutil -c icns "$ICON_DIR" -o "$SCRIPT_DIR/AppIcon.icns"
rm -rf "$ICON_DIR"
echo "      完了: AppIcon.icns"

# ---- [1/4] .app バンドルを構築 ----
echo "[1/4] .app バンドルを構築中..."
rm -rf "$OUT_APP"
mkdir -p "$OUT_APP/Contents/MacOS"
mkdir -p "$OUT_APP/Contents/Resources"

# ---- シェルスクリプト形式のランチャーを生成（AppleScript パターン）----
# Swift コンパイル不要。osascript でダイアログ・通知を実現する。
cat > "$OUT_APP/Contents/MacOS/StrideEdge" << LAUNCHER_EOF
#!/bin/bash
# StrideEdge Investment Terminal — macOS Launcher (AppleScript pattern)

LOCK_FILE="/tmp/strideedge_launcher.lock"
START_BG="${SCRIPT_DIR}/start_bg.sh"
LOG_DIR="${SCRIPT_DIR}/../logs"

# ログインシェル環境をロード
source ~/.zshrc 2>/dev/null || source ~/.bash_profile 2>/dev/null
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"

_notify() {
    osascript -e "display notification \"\$1\" with title \"StrideEdge Investment Terminal\"" 2>/dev/null &
}

_dialog() {
    osascript -e "button returned of (display dialog \"\$1\" buttons {\"\$2\", \"\$3\", \"\$4\"} default button \"\$2\" with title \"StrideEdge\" with icon note)" 2>/dev/null
}

_open_terminal() {
    # Chrome --app モード: URLバー・タブなしの独立ウィンドウで起動
    if open -a "Google Chrome" --args --app="http://localhost:3000" 2>/dev/null; then
        return 0
    fi
    # フォールバック: デフォルトブラウザ
    open http://localhost:3000
}

_check_backend() {
    curl -s --max-time 2 http://localhost:8000/health > /dev/null 2>&1
}

_check_frontend() {
    curl -s --max-time 1 http://localhost:3000 > /dev/null 2>&1
}

# ── すでに起動済みか確認 ──────────────────────────────────
if _check_backend; then
    CHOICE=\$(_dialog "StrideEdge はすでに起動しています。" "ブラウザを開く" "停止する" "キャンセル")
    case "\$CHOICE" in
        "ブラウザを開く")
            _open_terminal ;;
        "停止する")
            curl -s -X POST http://localhost:8000/api/shutdown 2>/dev/null || true
            sleep 2
            lsof -ti TCP:8000 | xargs kill -9 2>/dev/null || true
            lsof -ti TCP:3000 | xargs kill -9 2>/dev/null || true
            rm -f "\$LOCK_FILE"
            _notify "StrideEdge を停止しました" ;;
    esac
    exit 0
fi

# ── 多重起動防止（ロックファイル）─────────────────────────
if [ -f "\$LOCK_FILE" ]; then
    EXISTING_PID=\$(cat "\$LOCK_FILE" 2>/dev/null | tr -d '[:space:]')
    if [ -n "\$EXISTING_PID" ] && kill -0 "\$EXISTING_PID" 2>/dev/null; then
        exit 0
    fi
    rm -f "\$LOCK_FILE"
fi
echo \$\$ > "\$LOCK_FILE"

# ── 起動シーケンス ────────────────────────────────────────
_notify "StrideEdge Investment Terminal を起動しています..."
mkdir -p "\$LOG_DIR"
bash "\$START_BG" > /dev/null 2>&1 &

# バックエンド待機（最大 30 秒）
WAITED=0
while [ \$WAITED -lt 30 ]; do
    _check_backend && break
    sleep 1
    WAITED=\$((WAITED + 1))
done

if [ \$WAITED -ge 30 ]; then
    rm -f "\$LOCK_FILE"
    osascript -e 'display alert "起動エラー" message "バックエンドの起動に失敗しました。\nログを確認してください。" as critical' 2>/dev/null
    exit 1
fi

# フロントエンド待機（最大 60 秒）
WAITED=0
while [ \$WAITED -lt 60 ]; do
    _check_frontend && break
    sleep 1
    WAITED=\$((WAITED + 1))
done

rm -f "\$LOCK_FILE"
_open_terminal
_notify "StrideEdge Investment Terminal が起動しました！"
LAUNCHER_EOF

chmod +x "$OUT_APP/Contents/MacOS/StrideEdge"

# ---- Info.plist ----
cat > "$OUT_APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>StrideEdge</string>
    <key>CFBundleIdentifier</key>
    <string>com.daiki.strideedge</string>
    <key>CFBundleName</key>
    <string>StrideEdge</string>
    <key>CFBundleDisplayName</key>
    <string>StrideEdge</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleVersion</key>
    <string>2.0</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
PLIST

cp "$SCRIPT_DIR/AppIcon.icns" "$OUT_APP/Contents/Resources/AppIcon.icns"
xattr -cr "$OUT_APP"
codesign --force --deep --sign - "$OUT_APP"
echo "      完了: $OUT_APP"

# ---- [2/4] デスクトップへコピー ----
echo "[2/4] デスクトップへコピー中..."
rm -rf "$DESKTOP_APP"
cp -r "$OUT_APP" "$DESKTOP_APP"
xattr -cr "$DESKTOP_APP"
codesign --force --deep --sign - "$DESKTOP_APP"
echo "      完了: $DESKTOP_APP"

# ---- [3/4] Gatekeeper 登録 ----
echo "[3/4] Gatekeeper 登録..."
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$DESKTOP_APP" 2>/dev/null || true
touch "$DESKTOP_APP"
spctl --add "$DESKTOP_APP" 2>/dev/null \
  && echo "      Gatekeeper: 登録済み" \
  || echo "      Gatekeeper: スキップ（右クリック→開く で初回起動）"

# ---- [4/4] 一時ファイル削除 ----
echo "[4/4] 後処理..."
rm -f "$SCRIPT_DIR/AppIcon.icns"

echo ""
echo "========================================="
echo "  ビルド完了（AppleScript方式）"
echo "  Swift コンパイル不要"
echo "  $DESKTOP_APP"
echo "========================================="
