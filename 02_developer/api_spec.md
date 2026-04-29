# API仕様書

**担当ロール**: 開発者  
**最終更新**: 2026-04-19

---

## 既存エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/races | レース一覧（日付フィルタ可） |
| GET | /api/races/dates | 開催日一覧 |
| GET | /api/races/calendar/{year}/{month} | カレンダービュー |
| GET | /api/races/{race_id} | レース詳細 |
| GET | /api/races/{race_id}/entries | 出走馬一覧 |
| GET | /api/analysis/{race_id} | スコア計算結果 |
| GET | /api/analysis/{race_id}/tickets | 券種別提案 |
| POST | /api/analysis/{race_id}/manual-correction | 手動スコア補正 |
| DELETE | /api/analysis/{race_id}/manual-correction | 補正クリア |
| GET | /api/predictions/daily | 日次予想 |
| GET | /api/predictions | 保存済み予想一覧 |
| POST | /api/predictions | 予想保存 |
| GET | /api/results | 結果一覧 |
| POST | /api/results | 結果登録 |
| GET | /api/roi | 回収率・的中率分析 |
| GET | /api/settings | 設定取得 |
| PUT | /api/settings | 設定更新 |
| GET | /api/memos/{race_id} | メモ取得 |
| PUT | /api/memos/{race_id} | メモ保存 |
| GET | /api/alarms | アラーム一覧 |
| POST | /api/alarms | アラーム作成 |
| DELETE | /api/alarms/{alarm_id} | アラーム削除 |

---

## Phase 4 新規エンドポイント

### POST /api/sync/races

| 項目 | 内容 |
|------|------|
| 用途 | 指定日のレース情報・出走表を取得してDBに保存（手動トリガー） |
| クエリパラメータ | `date: string`（YYYY-MM-DD）必須 |
| 200 success | `{"status":"success","races_fetched":12,"entries_fetched":144,"errors":[]}` |
| 200 partial | `{"status":"partial","races_fetched":8,"entries_fetched":96,"errors":["R04:必須フィールド取得失敗"]}` |
| 200 block_detected | `{"status":"block_detected","message":"IPブロックを検知しました"}` |
| 409 Conflict | `{"detail":"既にsync実行中です"}` |
| 500 error | `{"status":"error","message":"ネットワークエラー:..."}` |

### GET /api/sync/logs

| 項目 | 内容 |
|------|------|
| 用途 | スクレイプ実行履歴一覧 |
| クエリパラメータ | `limit: int`（デフォルト20） |
| レスポンス | ScrapeLog[] （scraped_at降順） |
