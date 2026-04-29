# データモデル定義

**担当ロール**: 開発者  
**最終更新**: 2026-04-19

---

## 既存テーブル一覧

| テーブル | 主要カラム | 備考 |
|---------|-----------|------|
| races | race_id(UNIQUE), race_name, race_date, venue, race_number, distance, surface, grade, race_class, prize_money, status, is_win5, created_at | |
| horses | horse_id(UNIQUE), horse_name, age, sex, trainer, owner, created_at | |
| entries | entry_id(UNIQUE), race_id, horse_id, horse_number, gate_number, jockey, weight_carried, odds, popularity, recent_results, horse_weight, horse_weight_diff | |
| analysis_results | race_id, horse_id, total_score, 各スコア, reasons(JSON), warnings(JSON), created_at | |
| predictions | race_id, mode, ticket_type, buy_candidates(JSON), total_budget, memo, created_at | |
| race_results | race_id(UNIQUE), first_place, second_place, third_place, fourth_place, result_detail(JSON), registered_at | |
| race_memos | race_id(UNIQUE), memo, updated_at | |
| settings | key(UNIQUE), value, updated_at | キーバリューストア |
| alarms | race_id, race_name, race_date, race_time, minutes_before, notify_mac, notify_email, fired, created_at | |

---

## Phase 4 追加テーブル

### scrape_logs

| カラム | 型 | NULL可否 | デフォルト | 説明 |
|--------|-----|----------|-----------|------|
| id | INTEGER PK | NOT NULL | AUTOINCREMENT | |
| target_date | TEXT | NOT NULL | | 対象開催日（YYYY-MM-DD） |
| url | TEXT | NOT NULL | | 取得対象URL |
| status | TEXT | NOT NULL | | success / partial / error / running / block_detected |
| races_fetched | INTEGER | NULL | 0 | 取得レース数 |
| entries_fetched | INTEGER | NULL | 0 | 取得エントリー数 |
| error_message | TEXT(1000) | NULL | NULL | エラー概要（詳細はlogs/scraper.log） |
| scraped_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | |

---

## race_id採番規則

- netkeiba.comのレースID（URLパスに含まれる12桁数字）をそのまま使用
- 例: `202504190101`（2025年4月19日・会場01・1R）
- horse_idも同様にnetkeiba IDを流用

---

## NULL保存ポリシー

| カテゴリ | 対象フィールド | NULLの場合 |
|---------|--------------|-----------|
| 必須 | race_id, race_name, race_date, venue, race_number, distance, surface / horse_id, horse_name / horse_number, gate_number, jockey | レコードを保存せず、scrape_logsにpartialを記録 |
| 任意 | grade, race_class, prize_money, age, sex, trainer, owner / weight_carried, odds, popularity, horse_weight, horse_weight_diff, recent_results | NULLのまま保存。scrape_logsはsuccessのまま |

---

## recent_resultsフォーマット

- 直近5走の着順をハイフン区切り（例: `"1-3-2-5-1"`）
- 中止・除外は `"中"` または `"除"` で記録
- 構造化データ（距離・馬場別）はPhase 5で horse_race_history テーブルを追加予定

---

## SQLite設定

- 起動時に `PRAGMA journal_mode=WAL` を実行（init_db.pyに追加）
