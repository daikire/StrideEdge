# StrideEdge — 競馬予想支援アプリ

ダミーデータを使った競馬予想支援MVPです。ローカルで全画面を遷移・確認できます。

## 起動方法

### 一括起動（推奨）

```bash
cd /Users/Daiki/ClaudeCode/030_StrideEdge
bash start.sh
```

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs

**起動の流れ:**
1. バックエンドが起動し、HTTP応答を確認するまで自動待機（最大30秒）
2. フロントエンドが起動し、HTTP応答を確認するまで自動待機（最大60秒）
3. 全サービス準備完了後、ブラウザが自動的に http://localhost:3000 を開きます

> **注意:** フロントエンドは初回起動時に Next.js のコンパイルが走るため、**30秒程度**かかることがあります。ブラウザが開くまでそのままお待ちください。

**ログの確認場所:**
- バックエンドログ: `logs/backend.log`
- フロントエンドログ: `logs/frontend.log`

エラーが発生した場合は上記ログを確認してください。

### 個別起動

バックエンド:
```bash
cd backend
pip install -r requirements.txt
python -m app.database.init_db   # DB初期化（初回のみ）
uvicorn app.main:app --reload --port 8000
```

フロントエンド:
```bash
cd frontend
npm install
npm run dev
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | Python + FastAPI + uvicorn |
| DB | SQLite + SQLAlchemy (非同期) |
| Data | pandas, pydantic |

## 画面一覧

| URL | 画面 |
|-----|------|
| `/` | ダッシュボード |
| `/races` | 開催日別レース一覧 |
| `/races/[raceId]` | レース分析（スコアランキング・根拠パネル） |
| `/races/[raceId]/tickets` | 券種別提案（単勝・馬連・ワイド・3連複） |
| `/history` | 過去履歴（予想・結果） |
| `/results` | 結果登録 |
| `/datasources` | データソース確認 |
| `/settings` | 設定（重み・予算・ON/OFFトグル） |

## ディレクトリ構成

```
StrideEdge/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPIエントリーポイント
│   │   ├── config.py            # 設定
│   │   ├── models/schemas.py    # Pydanticモデル
│   │   ├── routers/             # APIルーター
│   │   ├── services/            # ビジネスロジック
│   │   └── database/            # DB接続・初期化
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router ページ
│       ├── components/          # UIコンポーネント
│       ├── lib/api.ts           # APIクライアント
│       └── types/index.ts       # 型定義
├── data/
│   ├── sample/sample_races.csv  # サンプルCSV
│   └── stride_edge.db           # SQLite DB（起動後に生成）
├── 01_pm/                       # 要件定義・インシデントログ・既知課題
├── 02_developer/                # 設計書・スキーマ・実装スクリプト
├── 03_tester/                   # テスト計画・テスト結果
├── 04_reviewer/                 # レビュー指摘・再発防止策
├── logs/                        # 起動ログ（start.sh が自動生成）
│   ├── backend.log
│   └── frontend.log
└── start.sh                     # 一括起動スクリプト
```

## スコアリングロジック

各出走馬のスコアを以下の特徴量から算出します：

| 特徴量 | 最大スコア | 内容 |
|-------|-----------|------|
| 直近成績 | 30pt | 直近5戦の着順（新しい順に重み付け） |
| オッズ | 20pt | 単勝オッズによる人気度 |
| 距離適性 | 15pt | 距離・馬場カテゴリ |
| 騎手 | 15pt | 騎手の評価 |
| 枠順 | 10pt | 距離に応じた枠の有利不利 |
| 手動補正 | 10pt | ユーザーによる手動調整 |

## 実データ同期の運用条件（Phase 4 確定ルール）

> SE-001（利用規約確認）完了済み。以下の条件を遵守した上で手動同期を許可する。

| 条件 | 内容 |
|------|------|
| **実行方式** | 手動トリガーのみ（`/datasources` 画面から実行）。自動スケジューラは禁止 |
| **対象データ** | 現フェーズ（Phase 4）で定義された対象のみ（レース情報・出走表） |
| **ブロック時の動作** | `block_detected` を検知した場合は即時停止し、処理を中断する |
| **ログ保存** | 全同期実行は `scrape_logs` テーブルに必ず記録する |
| **実行頻度** | 必要最小限に留める。1日1〜2回程度を目安にする |

詳細な絶対条件は `01_pm/requirements.md` の「netkeiba アクセス絶対条件」セクションを参照。

---

## 注意事項

- 本アプリは**参考情報の提供**を目的としています
- 馬券購入は**自己判断・自己責任**でお願いします
- 実データ同期は上記「実データ同期の運用条件」に従い手動で実行してください
