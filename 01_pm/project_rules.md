# StrideEdge — プロジェクトルール（ディレクトリ構造と管理規則）

**作成日**: 2026-04-26  
**担当ロール**: PM

---

## ルートディレクトリ

```
/Users/Daiki/ClaudeCode/030_StrideEdge/
```

---

## ディレクトリ構造と格納ルール

| フォルダ | 役割 | 格納するもの |
|---------|------|-------------|
| `01_pm/` | PM | 要件定義書（requirements.md）、インシデントログ（incident_log.md）、既知課題（known_issues.md）、プロジェクトルール（project_rules.md）、README.md |
| `02_developer/` | 開発者 | アーキテクチャ設計書（architecture.md）、APISpec（api_spec.md）、DBスキーマ（db_schema.md）、実装スクリプト（scripts/） |
| `03_tester/` | テスター | テスト計画（test_plan.md）、テスト結果（test_results.md） |
| `04_reviewer/` | レビュアー | レビュー指摘（review_comments.md）、再発防止策（preventive_measures.md） |
| `05_app/` | ビルド成果物 | macOS `.app` バイナリ、ビルドスクリプト（build_app.sh）、起動スクリプト（start.sh, start_bg.sh） |
| `backend/` | バックエンド実装 | FastAPI アプリ（app/）、依存パッケージ（requirements.txt） |
| `frontend/` | フロントエンド実装 | Next.js アプリ（src/） |
| `logs/` | 実行ログ | 起動ログ・Gemini連携ログ（YYYYMMDD_トピック.log） |

> `docs/` フォルダは廃止。ドキュメントはすべて `01_pm/`〜`04_reviewer/` に格納する。

---

## 重要なパス一覧

| 対象 | パス |
|------|------|
| 要件定義書 | `01_pm/requirements.md` |
| DBスキーマ | `02_developer/db_schema.md` |
| アーキテクチャ | `02_developer/architecture.md` |
| API仕様 | `02_developer/api_spec.md` |
| テスト実行 | `pytest backend/tests/ -v` |
| アプリ起動 | `bash 05_app/start_bg.sh` または `05_app/StrideEdge.app` |
| アプリビルド | `bash 05_app/build_app.sh` |

---

## チーム体制と作業フロー

```
[PM] 要件定義・スコープ管理
  ↓
[開発者] 設計・実装
  ↓
[テスター] 正常系・異常系・回帰テスト
  ↓
[レビュアー] 要件漏れ・設計不備・再発防止確認
```

---

## 行動規範

1. `docs/` への出力・参照は禁止。対応するロールフォルダに格納する。
2. 作業完了後は `logs/` に Gemini 連携ログを出力する。
3. `backend/` または `frontend/` を変更したら `bash 05_app/build_app.sh` でアプリを再ビルドする。
4. **プロジェクトフォルダをリネームした場合は必ず `bash 05_app/build_app.sh` を再実行する**（バイナリにパスが焼き込まれるため）。
5. スクレイピングには必ず 1〜3秒のランダム sleep を入れる（IP ブロック対策）。
6. DB 保存は 1レース単位でトランザクション管理する。
7. 機密情報（APIキー等）は `.env` で管理し、コミットしない。

---

## build_app.sh の動的パス解決メカニズム（PRV-003）

- Swift ソース内では `__SCRIPT_DIR__` プレースホルダーを使用
- ビルド時に `sed` で `$SCRIPT_DIR`（`05_app/` の絶対パス）に置換
- `start_bg.sh` 内では `PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"` で一階層上のプロジェクトルートを導出
- これにより `backend/`・`frontend/` を正しく参照できる
