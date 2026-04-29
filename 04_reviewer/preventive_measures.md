# 再発防止策一覧

**担当ロール**: レビュアー / 恒久対策担当  
**最終更新**: 2026-04-27

---

## 再発防止策一覧

| 対策ID | 対象障害ID | 対策名 | 対策区分 | 対策内容 | 実施担当 | 実施時期 | 効果確認方法 | 有効性判定 | 備考 |
|--------|-----------|--------|---------|---------|---------|---------|------------|-----------|------|
| PRV-001 | INC-001 | 起動スクリプトにヘルスチェックとブラウザ自動オープンを追加 | 実装・手順 | start.shにcurlポーリングループを追加し、バックエンド(8000)とフロントエンド(3000)がHTTP応答を返すまで待機してからブラウザを開く | 開発者 | 2026-04-15 | bash start.sh実行後にブラウザが自動オープンしページが表示される | 有効 | T-006で確認済み |
| PRV-002 | INC-002 | .app自動リビルドルールをCLAUDE.mdに明記・ブラウザ停止ボタンを実装 | 実装・手順・ナレッジ共有 | ①CLAUDE.mdに「変更後はbuild_app.shを必ず実行する」ルールを追記。②build_app.shを新規作成（AppleScriptをコンパイルしデスクトップへ自動コピー）。③設定画面に「StrideEdgeを停止する」ボタンを追加。④POST /api/shutdownエンドポイントを実装（frontend.pidを読んでプロセスを終了） | 開発者 | 2026-04-19 | ①変更後にbuild_app.shが実行されデスクトップのアプリが最新になること。②設定画面の停止ボタン押下でアプリが停止しタブが閉じられること | 有効 | — |
| PRV-003 | — | build_app.sh の Swift ソース内パスを動的解決に変更 | 実装 | ①ヒアドキュメントを `<< 'SWIFT'`（クォート済み）のまま保ち、Swift ソース内に `__SCRIPT_DIR__` プレースホルダーを埋め込む。②ヒアドキュメント終端直後に `sed -i '' "s|__SCRIPT_DIR__|${SCRIPT_DIR}|" "$SWIFT_SRC"` でビルド時に実パスを展開する。③ `start_bg.sh` では `SCRIPT_DIR`（05_app/）から `PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)` を導出し、backend/frontend の参照に使用する。 | 開発者 | 2026-04-26 | `strings StrideEdge.app/Contents/MacOS/StrideEdge \| grep start_bg` で正しいパスが埋め込まれていること。アプリ起動後 `curl http://localhost:8000/health` と `curl http://localhost:3000` が 200 を返すこと | 有効 | フォルダリネーム（StrideEdge→030_StrideEdge）によるパスミスマッチが起点。再発防止として「プロジェクトフォルダをリネームした場合は必ず build_app.sh を再実行する」を project_rules.md に追記 |

---

## 再発防止策の記述ルール

**禁止表現（曖昧な表現）**
- 「注意する」「気をつける」「よく確認する」

**必須要素**
- 対策内容: 具体的な実装・設定・手順の変更内容
- 効果確認方法: どのテストで確認するか
- 有効性判定: テスト後に「有効」または「不十分（理由）」を記録

| PRV-004 | INC-004 | .app起動時のPATH設定とプロセスグループ分離 | 実装 | ①start_bg.shに`export PATH="$NODE_BIN:$PATH"`を追加し、.app起動時にもnvmのnodeが解決されるようにする。②backend/frontendをPython subprocess + preexec_fn=os.setsid()で起動し、呼び出し元のプロセスグループから完全に独立させる。③shutdown.pyのos.killpg()を廃止し、個別PID kill + _kill_by_port()によるポートベースkillに統一する。 | 開発者 | 2026-04-27 | start_bg.sh単体実行後にlsofでbackend/frontendのPGIDが呼び出し元と異なること、かつcurl http://localhost:3000が200を返すこと。10回連続起動・停止テストで全件PASS。 | 有効 | 10回連続PASS確認済 |

---

## 採番ルール

- 対策ID: `PRV-XXX`（3桁連番）
