# 設計思想書 / アーキテクチャ

**担当ロール**: 開発者  
**最終更新**: 2026-04-26（Investment Terminal シフト）  
**バージョン**: 1.3（UI設計思想: Investment Terminal へ刷新）  
**参照要件**: 01_pm/requirements.md

---

## 基本方針

- ローカルファースト（ネット不通でも手動入力・CSV取込で動作継続）
- データ取得層・分析層・API層・UI層を明確に分離
- 将来のデータソース差し替えが容易な構造（Scraper差し替えでJRA-VAN対応可能）
- データ取得不可でも画面確認可能なフォールバック必須

---

## システム全体構成

```
[Frontend: Next.js 14 + TypeScript + Tailwind CSS]
        ↓ REST API (http://localhost:8000)
[Backend: Python + FastAPI + uvicorn]
    ├── Routers
    │   ├── (既存) races / analysis / predictions / history / roi / settings / alarms / memos
    │   └── (Phase 4追加) sync.py
    ├── Services
    │   ├── (既存) analysis_service.py   スコアリング（6特徴量）
    │   ├── (既存) ticket_service.py     3モード別買い目生成
    │   ├── (既存) db_service.py         汎用DB操作
    │   └── (Phase 4追加) data_sync_service.py  オーケストレーション
    ├── Scrapers          ← Phase 4追加
    │   └── netkeiba_scraper.py
    ├── Repositories      ← Phase 4追加
    │   └── race_repository.py
    └── Database: SQLite（非同期 / aiosqlite + WALモード）
```

---

## Phase 4 追加モジュール詳細

### 1. NetkeibaScraper（scrapers/netkeiba_scraper.py）

**責務**: HTML取得とパースの完全分離。DB構造を知らない。

```
NetkeibaScraper
├── fetch_html(url: str) → str          # HTTP取得のみ。テスト時はモック差し替え可能
├── parse_race_list(html: str) → list[ScrapedRace]   # レース一覧パース
├── parse_entries(html: str) → list[ScrapedEntry]    # 出走表パース
└── _extract_number(text: str) → int | None          # "480(+4)"→480 の共通抽出ロジック
```

**Pydanticモデル（ScrapedRace / ScrapedEntry）**  
- parse時点で文字列→数値変換・バリデーションを完結させる
- `weight_carried: float | None`（"56.0"→56.0）
- `horse_weight: int | None`（"480(+4)"→480）
- `horse_weight_diff: int | None`（"480(+4)"→+4）
- `odds: float | None`（取得不可時None）
- `popularity: int | None`（取得不可時None）
- 必須フィールド（race_id, race_name, race_date, venue, race_number, distance, surface, horse_id, horse_name, horse_number, gate_number, jockey）は `None` 不可。パース失敗時はValidationError

**IPブロック対策**
- リクエスト間隔: 1〜3秒のランダムsleep（必須）
- HTTP 403 / 予期しないリダイレクト検知 → `BlockDetectedError` を raise
- 1セッション最大150リクエスト

---

### 2. DataSyncService（services/data_sync_service.py）

**責務**: オーケストレーションのみ。ScraperとRepositoryを呼び出す。DB構造もHTML構造も知らない。

```python
async def sync_races(date: str) -> SyncResult:
    # 1. scrape_logsにstatus=running記録
    # 2. NetkeibaScraper.fetch_html → parse_race_list → ScrapedRace[]
    # 3. 各レースに対してfetch_html → parse_entries → ScrapedEntry[]
    # 4. RaceRepository.save_race(race, entries)を呼び出す
    # 5. scrape_logsをsuccess/partial/error/block_detectedに更新
    # 6. SyncResultを返す
```

---

### 3. RaceRepository（repositories/race_repository.py）

**責務**: races/horses/entries テーブルへのDB保存。1レース=1トランザクション。

```python
async def save_race(race: ScrapedRace, entries: list[ScrapedEntry], session: AsyncSession):
    async with session.begin():  # トランザクション開始
        # INSERT ... ON CONFLICT(race_id) DO UPDATE SET ...（races）
        # INSERT ... ON CONFLICT(horse_id) DO UPDATE SET ...（horses）
        # DELETE FROM entries WHERE race_id = ?（既存エントリー削除）
        # INSERT INTO entries ...（新規エントリー一括挿入）
        # エラー時は自動ロールバック（ゴミデータが残らない）
```

**冪等性保証**: 同一race_idで何度実行しても重複しない  
**トランザクション境界**: 1レース単位。部分失敗でもロールバックされる

---

### 4. SyncRouter（routers/sync.py）

| エンドポイント | 説明 |
|--------------|------|
| POST /api/sync/races?date=YYYY-MM-DD | 手動トリガー。同時実行防止（409） |
| GET /api/sync/logs?limit=20 | scrape_logs一覧取得 |

---

## DB追加テーブル（scrape_logs）

```sql
CREATE TABLE scrape_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    target_date   TEXT        NOT NULL,
    url           TEXT        NOT NULL,
    status        TEXT        NOT NULL,  -- success/partial/error/running/block_detected
    races_fetched INTEGER     DEFAULT 0,
    entries_fetched INTEGER   DEFAULT 0,
    error_message TEXT,                  -- 最大1000文字
    scraped_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);
```

---

## SQLite設定変更

```python
# init_db.py に追加
await conn.execute("PRAGMA journal_mode=WAL")
```

---

## データフロー（手動トリガー）

```
① ユーザーが /datasources 画面でボタン押下
        ↓
② POST /api/sync/races?date=YYYY-MM-DD
        ↓
③ SyncRouter
    scrape_logsにrunning存在? → YES: 409 Conflict
                               → NO: DataSyncService.sync_races(date) を呼び出す
        ↓
④ DataSyncService
    scrape_logs: status=running で記録
    NetkeibaScraper.fetch_html(レース一覧URL)
    → parse_race_list(html) → ScrapedRace[]
    各ScrapedRaceに対して:
        NetkeibaScraper.fetch_html(出走表URL)  ← 2秒待機
        → parse_entries(html) → ScrapedEntry[]
        ↓
⑤ RaceRepository.save_race(race, entries)
    async with session.begin():
        races: ON CONFLICT DO UPDATE
        horses: ON CONFLICT DO UPDATE
        entries: DELETE既存 → INSERT新規
    ※ エラー時は自動ロールバック
        ↓
⑥ scrape_logs: status=success/partial/error/block_detected に更新
        ↓
⑦ SyncRouter → {status, races_fetched, entries_fetched, errors[]} 返却
        ↓
⑧ フロントエンド: /datasources 画面に結果表示
```

---

## 既存機能への影響（ゼロ影響方針）

- 既存の `analysis_service.py` / `ticket_service.py` / `db_service.py` は変更しない
- 既存テーブル（races/horses/entries）の構造変更はしない
- Phase 4でテーブルに実データを書き込むことで、スコアリング精度は自動的に向上する
- ダミーデータはそのまま残す（実データが存在しない日付は従来通り動作）

---

---

## UI/UX 設計方針（Investment Terminal）

### 採用テーマ: "Investment Prediction Terminal"

```
コンセプト: 金融ブルームバーグ端末 × ヘッジファンドのリスク分析ダッシュボード
テーマ:     Precision / Dark Mode Finance / ROI-First
更新履歴:   2026-04-26 "Luxury Racing Terminal" → "Investment Terminal" にシフト
```

競馬レースを「投資対象」として分析する視点を前面に出す。
的中率・回収率・ROI を常に可視化し、データドリブンな意思決定を支援する。

---

### ダッシュボード構成案（ROI 前面）

```
┌─────────────────────────────────────────────────────────────────────┐
│  STRIDEEDGE  INVESTMENT TERMINAL          [DATE] [LAST SYNC]        │
├──────────────┬──────────────┬──────────────┬──────────────────────┤
│  Today P&L   │  Win Rate    │  ROI (30d)   │  Stake / Race        │
│  +¥4,200     │  34.2%       │  +18.7%      │  ¥1,000              │
├──────────────┴──────────────┴──────────────┴──────────────────────┤
│  RACE GRID  (高密度データグリッド)                                    │
│  #  │ Race Name        │ Score │ Fav │ Bet Type  │ Stake │ Exp ROI │
│  1  │ 東京11R 日本ダービー │ 87.3  │  2  │ 単複ワイド │ 2,000 │ +23%    │
│  2  │ 阪神10R           │ 72.1  │  5  │ 馬単      │ 1,000 │ +8%     │
│  ...│                  │       │     │           │       │         │
├──────────────────────────────────────────────────────────────────┤
│  PERFORMANCE CHART  (週次 ROI 推移グラフ)                           │
└──────────────────────────────────────────────────────────────────┘
```

---

### 高密度データグリッド設計

| 列 | 表示内容 | 備考 |
|----|---------|------|
| Score | 予測スコア（0〜100） | カラーバーで強調 |
| Fav | 人気順位 | 低人気穴馬は amber 色 |
| ROI Exp | 期待ROI（%) | 正値=green / 負値=red |
| Stake | 推奨投資額 | バンクロール管理連動 |
| Kelly | Kelly基準配分(%) | オーバーベット警告 |
| Result | 確定結果 | 的中=green / 外れ=red |

---

### 実装フェーズ（バックエンド先行 → UI刷新）

| フェーズ | 内容 | 優先度 |
|---------|------|--------|
| **UI Phase A（現在）** | バックエンド実データ疎通を最優先。既存UIのまま実データ表示を確認 | 最高 |
| **UI Phase B** | ROI ダッシュボード・高密度グリッド・Framer Motion 導入 | Phase 4完了後 |
| **UI Phase C** | フォント刷新・Investment Terminal カラー・レイアウト最終仕上げ | Phase 5以降 |

---

### UI Phase B 実装計画

```bash
npm install framer-motion recharts
```

**ROI サマリーカード:**
```tsx
// KPICard.tsx: P&L / Win Rate / ROI(30d) を横並びで表示
// 数値は 0 → 実値へ 600ms カウントアップアニメーション
```

**高密度グリッド（RaceGrid.tsx）:**
```tsx
// 1行 = 1レース。スコアバーアニメーション。
// ROI 正/負で行背景色を subtle に変化（green-950 / red-950）
<motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
  transition={{ duration: 0.5, ease: "easeOut" }} />
```

**週次 ROI チャート:**
```tsx
// recharts LineChart で週次 ROI 推移を表示
// ゼロラインを amber で強調（損益分岐点を常に意識）
```

---

### Typography 方針（Phase C）

| 用途 | フォント | 理由 |
|------|---------|------|
| 数値・スコア・ROI | DM Mono | Bloomberg 端末風の精密数値表示 |
| 見出し・レース名 | Inter (600weight) | 金融UIの標準：清潔・高密度 |
| 日本語本文 | Noto Sans JP | 視認性優先（Serif より情報密度が高い） |
| 警告・KPI ラベル | Roboto Mono | ターミナル感を補強 |

### カラーパレット（Investment Terminal）

| 用途 | カラー | HEX |
|------|--------|-----|
| 背景 | Charcoal Black | `#0A0A0F` |
| カード背景 | Deep Navy | `#12121C` |
| ボーダー | Muted Gold | `#3A3020` |
| アクセント | Gold | `#D4AF37` |
| 利益 | Terminal Green | `#22C55E` |
| 損失 | Terminal Red | `#EF4444` |
| 警告 | Amber | `#F59E0B` |
| テキスト | Off White | `#E2E8F0` |

### NEVER（避けるべき選択）

- 競馬・馬・蹄鉄などのレース特化ビジュアル（投資端末として汎用性を保つ）
- 白背景 + カラフル UI（金融端末はダークモード一択）
- すべての要素が縦積みの均一レイアウト（グリッド・複数カラム・情報密度を重視）
- 1行あたりのデータが少ないカード形式（Bloomberg 風の高密度グリッドを優先）

---

## ディレクトリ構成（Phase 4完了後）

```
StrideEdge/
├── 01_pm/
├── 02_developer/
├── 03_tester/
├── 04_reviewer/
├── backend/
│   └── app/
│       ├── main.py
│       ├── models/schemas.py
│       ├── routers/
│       │   └── sync.py               ← 新規
│       ├── services/
│       │   └── data_sync_service.py  ← 新規
│       ├── scrapers/
│       │   └── netkeiba_scraper.py   ← 新規
│       ├── repositories/
│       │   └── race_repository.py    ← 新規
│       └── database/
│           └── init_db.py            ← WALモード追加
├── backend/tests/                    ← 新規
│   ├── fixtures/                     HTMLモックファイル置き場
│   │   ├── sample_race_list.html
│   │   └── sample_entries.html
│   └── test_netkeiba_scraper.py      パーステスト（pytest）
├── frontend/src/
├── data/
└── logs/
    └── scraper.log                   ← 新規
```

---

## WIN5 対応設計（Phase 4 追加・2026-04-26）

### 現状と課題

- `races` テーブルに `is_win5 INTEGER DEFAULT 0` カラムが存在するが、スクレイパーは設定しておらず常に `0`
- JRA が定める WIN5 対象レースは公式サイト参照が必要で、自動特定は困難

### Phase 4 実装方針（ヒューリスティック）

**ヒューリスティックルール:**
- 当日のレースのうち `race_number >= 10` を満たすものを最大5件 (DESC) を WIN5 候補とする
- netkeiba の WIN5 専用ページのパース実装は Phase 5 以降

**バックエンド変更:**

| 変更 | 内容 |
|------|------|
| `db_service.get_win5_races(db, date)` | race_number >= 10 の上位5件を返す |
| `db_service.update_win5_flags(db, date)` | sync 後に is_win5 を自動更新 |
| `GET /api/races/win5?date=YYYY-MM-DD` | WIN5 候補レース一覧を返す |
| `data_sync_service` | sync 成功時に `update_win5_flags` を呼び出す |

**フロントエンド変更:**

| 変更 | 内容 |
|------|------|
| `RaceCard` | `is_win5 = true` のレースに紫バッジ `WIN5` を表示 |
| `races/page.tsx` | 「全レース / WIN5」フィルタートグルを追加 |

### Phase 5 以降の拡張計画

1. netkeiba の WIN5 出馬表ページ (`/race/win5/`) をスクレイプして正確な対象レースを取得
2. `races` テーブルの `is_win5` を公式データで更新するスクリプト追加
3. WIN5 専用ビューページ (`/win5`) にて5レース横断の予想・買い目提案を実装

### 関連ファイル

- `backend/app/services/db_service.py` — `get_win5_races()`, `update_win5_flags()`
- `backend/app/routers/races.py` — `GET /api/races/win5`
- `backend/app/services/data_sync_service.py` — sync後フラグ更新
- `frontend/src/components/Race/RaceCard.tsx` — WIN5バッジ
- `frontend/src/app/races/page.tsx` — WIN5フィルター
