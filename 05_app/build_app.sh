#!/bin/bash
# StrideEdge .app リビルドスクリプト（Swift バイナリ方式）
# 変更後に必ず実行する（CLAUDE.md参照）

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export SCRIPT_DIR
APP_NAME="StrideEdge"
OUT_APP="$SCRIPT_DIR/${APP_NAME}.app"
DESKTOP_APP="$HOME/Desktop/${APP_NAME}.app"
SWIFT_SRC="$SCRIPT_DIR/launcher.swift"

echo "=== StrideEdge .app ビルド開始 ==="

# ---- アイコン生成 ----
# icon.png が存在すれば sips + iconutil で変換。なければ Python 生成フォールバック。
echo "[0/5] アイコンを生成中..."
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
  echo "      sips リサイズ完了"
else
  echo "      icon.png 未検出。投資端末アイコン（金色の S）を強制生成..."
  python3 -c "
import os, struct, zlib, math

icon_dir = os.path.join('$SCRIPT_DIR', 'icon.iconset')

def write_png(path, size):
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    # Investment Terminal カラーパレット
    BG    = (10, 10, 15)       # 最暗ネイビー（背景）
    RING  = (212, 175, 55)     # 金色リング
    INNER = (18, 18, 28)       # ダーク内円
    GOLD  = (220, 185, 50)     # S 文字色

    cx, cy = size / 2.0, size / 2.0
    r = size * 0.46
    ring_inner = r * 0.90

    # S 字セグメント（x1, y1, x2, y2）
    sw   = size * 0.26
    sh   = size * 0.50
    sx   = cx - sw / 2.0
    sy   = cy - sh / 2.0
    bar  = max(2.0, size * 0.065)
    segs = [
        (sx,            sy,               sx + sw,       sy + bar),
        (sx,            cy - bar/2,       sx + sw,       cy + bar/2),
        (sx,            sy + sh - bar,    sx + sw,       sy + sh),
        (sx,            sy + bar,         sx + bar,      cy - bar/2),
        (sx + sw - bar, cy + bar/2,       sx + sw,       sy + sh - bar),
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

# ---- Swift ソースを生成 ----
cat > "$SWIFT_SRC" << 'SWIFT'
import Foundation

let lockPath = "/tmp/strideedge_launcher.lock"

func shell(_ args: [String], wait: Bool = true) -> Int32 {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: args[0])
    task.arguments = Array(args.dropFirst())
    task.standardOutput = FileHandle.nullDevice
    task.standardError = FileHandle.nullDevice
    try? task.run()
    if wait { task.waitUntilExit() }
    return task.terminationStatus
}

func shellOutput(_ args: [String]) -> String {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: args[0])
    task.arguments = Array(args.dropFirst())
    let pipe = Pipe()
    task.standardOutput = pipe
    task.standardError = FileHandle.nullDevice
    try? task.run()
    task.waitUntilExit()
    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    return (String(data: data, encoding: .utf8) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
}

func checkPort(_ port: Int) -> Bool {
    shell(["/usr/bin/curl", "-s", "--max-time", "2",
           "http://localhost:\(port)/health"]) == 0
}

func notify(_ msg: String) {
    _ = shell(["/usr/bin/osascript", "-e",
               "display notification \"\(msg)\" with title \"StrideEdge\""])
}

func dialog(_ msg: String, buttons: [String]) -> String {
    let btns = buttons.map { "\"\($0)\"" }.joined(separator: ", ")
    let script = "button returned of (display dialog \"\(msg)\" buttons {\(btns)} default button \"\(buttons[0])\" with title \"StrideEdge\" with icon note)"
    return shellOutput(["/usr/bin/osascript", "-e", script])
}

func openBrowser() {
    _ = shell(["/usr/bin/open", "http://localhost:3000"], wait: false)
}

// 多重起動防止：ロックファイルで同時実行を防ぐ
func acquireLock() -> Bool {
    if FileManager.default.fileExists(atPath: lockPath) {
        if let pidStr = try? String(contentsOfFile: lockPath, encoding: .utf8),
           let pid = Int32(pidStr.trimmingCharacters(in: .whitespacesAndNewlines)) {
            // PIDが生きており、かつそのプロセスが StrideEdge 自身であることを確認
            // kill -0 だけでは PID 再利用で別プロセスを誤検知するため、プロセス名も検証する
            let procName = shellOutput(["/bin/ps", "-p", "\(pid)", "-o", "comm="])
            if shell(["/bin/kill", "-0", "\(pid)"]) == 0 && procName.contains("StrideEdge") {
                return false
            }
        }
        try? FileManager.default.removeItem(atPath: lockPath)
    }
    let myPid = ProcessInfo.processInfo.processIdentifier
    try? "\(myPid)".write(toFile: lockPath, atomically: true, encoding: .utf8)
    return true
}

func releaseLock() {
    try? FileManager.default.removeItem(atPath: lockPath)
}

// すでに起動済みの場合はダイアログを出す（ロック不要）
if checkPort(8000) {
    let choice = dialog("StrideEdge はすでに起動しています。",
                        buttons: ["ブラウザを開く", "停止する", "キャンセル"])
    if choice == "ブラウザを開く" {
        openBrowser()
    } else if choice == "停止する" {
        _ = shell(["/usr/bin/curl", "-s", "-X", "POST",
                   "http://localhost:8000/api/shutdown"])
        Thread.sleep(forTimeInterval: 2)
        _ = shell(["/bin/bash", "-c",
                   "lsof -ti TCP:8000 | xargs kill -9 2>/dev/null; lsof -ti TCP:3000 | xargs kill -9 2>/dev/null; true"])
        releaseLock()
        notify("StrideEdge を停止しました")
    }
    exit(0)
}

// ロックを取得できなければ別インスタンスが起動中 → 静かに終了
guard acquireLock() else { exit(0) }

notify("StrideEdge を起動しています...")
_ = shell(["/bin/bash", "__SCRIPT_DIR__/start_bg.sh"], wait: false)

var waited = 0
while waited < 30 {
    if checkPort(8000) { break }
    Thread.sleep(forTimeInterval: 1)
    waited += 1
}
if waited >= 30 {
    releaseLock()
    _ = shell(["/usr/bin/osascript", "-e",
               "display alert \"起動エラー\" message \"バックエンドの起動に失敗しました。\" as critical"])
    exit(1)
}

waited = 0
while waited < 60 {
    if shell(["/usr/bin/curl", "-s", "--max-time", "1", "http://localhost:3000"]) == 0 { break }
    Thread.sleep(forTimeInterval: 1)
    waited += 1
}

releaseLock()
openBrowser()
notify("StrideEdge が起動しました！")
SWIFT

# ビルド時に SCRIPT_DIR を実際のパスに展開（動的解決）
sed -i '' "s|__SCRIPT_DIR__|${SCRIPT_DIR}|" "$SWIFT_SRC"

echo "[1/5] Swift をコンパイル中..."
swiftc -o "$SCRIPT_DIR/launcher_bin" "$SWIFT_SRC"
echo "      完了"

echo "[2/5] .app バンドルを構築中..."
rm -rf "$OUT_APP"
mkdir -p "$OUT_APP/Contents/MacOS"
mkdir -p "$OUT_APP/Contents/Resources"

cp "$SCRIPT_DIR/launcher_bin" "$OUT_APP/Contents/MacOS/StrideEdge"
chmod +x "$OUT_APP/Contents/MacOS/StrideEdge"
cp "$SCRIPT_DIR/AppIcon.icns" "$OUT_APP/Contents/Resources/AppIcon.icns"

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
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
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

xattr -cr "$OUT_APP"
codesign --force --deep --sign - "$OUT_APP"
echo "      完了: $OUT_APP"

echo "[3/5] デスクトップへコピー中..."
rm -rf "$DESKTOP_APP"
cp -r "$OUT_APP" "$DESKTOP_APP"
xattr -cr "$DESKTOP_APP"
codesign --force --deep --sign - "$DESKTOP_APP"
echo "      完了: $DESKTOP_APP"

echo "[4/5] アイコンキャッシュ・Gatekeeper 登録..."
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$DESKTOP_APP" 2>/dev/null || true
touch "$DESKTOP_APP"
# Gatekeeper の whitelist に追加（未登録のアドホック署名アプリを初回起動時にブロックしない）
spctl --add "$DESKTOP_APP" 2>/dev/null && echo "      Gatekeeper: 登録済み" || echo "      Gatekeeper: スキップ（権限不足の場合は sudo 実行 or 右クリック→開く）"
echo "      完了"

echo "[5/5] 一時ファイル削除..."
rm -f "$SWIFT_SRC" "$SCRIPT_DIR/launcher_bin" "$SCRIPT_DIR/AppIcon.icns"

echo ""
echo "========================================="
echo "  ビルド完了"
echo "  $DESKTOP_APP"
echo "========================================="
