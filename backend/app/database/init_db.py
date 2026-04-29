"""
DB初期化 + サンプルデータ投入スクリプト
python -m app.database.init_db で実行
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy import text
from app.database.db import engine
from app.config import DB_PATH
import datetime


CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS races (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id TEXT UNIQUE NOT NULL,
    race_name TEXT NOT NULL,
    race_date TEXT NOT NULL,
    venue TEXT NOT NULL,
    race_number INTEGER NOT NULL,
    distance INTEGER NOT NULL,
    surface TEXT NOT NULL DEFAULT 'turf',
    grade TEXT,
    race_class TEXT,
    prize_money INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled',
    is_win5 INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS horses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    horse_id TEXT UNIQUE NOT NULL,
    horse_name TEXT NOT NULL,
    age INTEGER,
    sex TEXT,
    trainer TEXT,
    owner TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT UNIQUE NOT NULL,
    race_id TEXT NOT NULL,
    horse_id TEXT NOT NULL,
    horse_number INTEGER NOT NULL,
    gate_number INTEGER,
    jockey TEXT,
    weight_carried REAL DEFAULT 55.0,
    odds REAL,
    popularity INTEGER,
    recent_results TEXT DEFAULT '',
    horse_weight INTEGER,
    horse_weight_diff INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (race_id) REFERENCES races(race_id),
    FOREIGN KEY (horse_id) REFERENCES horses(horse_id)
);

CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id TEXT NOT NULL,
    horse_id TEXT NOT NULL,
    total_score REAL DEFAULT 0,
    recent_score REAL DEFAULT 0,
    odds_score REAL DEFAULT 0,
    distance_score REAL DEFAULT 0,
    jockey_score REAL DEFAULT 0,
    gate_score REAL DEFAULT 0,
    manual_correction REAL DEFAULT 0,
    reasons TEXT DEFAULT '[]',
    warnings TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (race_id) REFERENCES races(race_id)
);

CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id TEXT NOT NULL,
    mode TEXT DEFAULT 'standard',
    ticket_type TEXT,
    buy_candidates TEXT DEFAULT '[]',
    total_budget INTEGER DEFAULT 0,
    memo TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (race_id) REFERENCES races(race_id)
);

CREATE TABLE IF NOT EXISTS race_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id TEXT UNIQUE NOT NULL,
    first_place TEXT,
    second_place TEXT,
    third_place TEXT,
    fourth_place TEXT,
    result_detail TEXT DEFAULT '{}',
    registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (race_id) REFERENCES races(race_id)
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS race_memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id TEXT UNIQUE NOT NULL,
    memo TEXT NOT NULL DEFAULT '',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (race_id) REFERENCES races(race_id)
);

CREATE TABLE IF NOT EXISTS alarms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id TEXT NOT NULL,
    race_name TEXT NOT NULL,
    race_date TEXT NOT NULL,
    race_time TEXT NOT NULL DEFAULT '15:30',
    minutes_before INTEGER NOT NULL DEFAULT 30,
    notify_mac INTEGER NOT NULL DEFAULT 1,
    notify_email INTEGER NOT NULL DEFAULT 1,
    fired INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (race_id) REFERENCES races(race_id)
);

CREATE TABLE IF NOT EXISTS scrape_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    target_date   TEXT        NOT NULL,
    url           TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'running',
    races_fetched INTEGER     DEFAULT 0,
    entries_fetched INTEGER   DEFAULT 0,
    error_message TEXT,
    scraped_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);
"""

# (race_id, race_name, race_date, venue, race_number, distance, surface, grade, race_class, prize_money, is_win5)
SAMPLE_RACES = [
    ("RACE_20250419_01", "皐月賞", "2025-04-19", "中山", 11, 2000, "turf", "G1", "3歳クラシック", 200000000, 1),
    ("RACE_20250419_02", "中山9R アルバタ賞", "2025-04-19", "中山", 9, 1800, "turf", None, "3歳500万下", 5000000, 0),
    ("RACE_20250419_03", "阪神10R 阪神大賞典", "2025-04-19", "阪神", 10, 3000, "turf", "G2", "4歳以上オープン", 40000000, 1),
    ("RACE_20250420_01", "東京11R フローラS", "2025-04-20", "東京", 11, 2000, "turf", "G2", "3歳牝馬オープン", 30000000, 1),
    ("RACE_20250420_02", "東京9R ゆりかもめ賞", "2025-04-20", "東京", 9, 1400, "dirt", None, "3歳500万下", 5000000, 0),
]

SAMPLE_HORSES = [
    ("HORSE_001", "ドウデュース", 4, "牡", "友道康夫"),
    ("HORSE_002", "イクイノックス", 5, "牡", "木村哲也"),
    ("HORSE_003", "リバティアイランド", 4, "牝", "中内田充正"),
    ("HORSE_004", "ソールオリエンス", 4, "牡", "手塚貴久"),
    ("HORSE_005", "タスティエーラ", 4, "牡", "堀宣行"),
    ("HORSE_006", "ファントムシーフ", 4, "牡", "西村真幸"),
    ("HORSE_007", "シャザーン", 4, "牡", "友道康夫"),
    ("HORSE_008", "サトノグランツ", 4, "牡", "友道康夫"),
    ("HORSE_009", "キングズパレス", 4, "牡", "池江泰寿"),
    ("HORSE_010", "レーベンスティール", 4, "牡", "田村康仁"),
    ("HORSE_011", "ミッキーカプチーノ", 4, "牝", "安田翔伍"),
    ("HORSE_012", "コナコースト", 4, "牝", "清水久詞"),
    ("HORSE_013", "モリアーナ", 4, "牝", "尾関知人"),
    ("HORSE_014", "ハーパー", 4, "牝", "友道康夫"),
    ("HORSE_015", "ライトクオンタム", 4, "牝", "金成貴史"),
    ("HORSE_016", "マテンロウスカイ", 5, "牡", "昆貢"),
    ("HORSE_017", "テーオーケインズ", 7, "牡", "高柳大輔"),
    ("HORSE_018", "ジャックドール", 6, "牡", "藤岡健一"),
    ("HORSE_019", "チャックネイト", 6, "牡", "安田翔伍"),
    ("HORSE_020", "グランオフィシエ", 5, "牡", "木村哲也"),
    ("HORSE_021", "オルフェーヴル産駒A", 3, "牡", "池江泰寿"),
    ("HORSE_022", "キタサンブラック産駒B", 3, "牡", "清水久詞"),
    ("HORSE_023", "ディープインパクト産駒C", 3, "牝", "友道康夫"),
    ("HORSE_024", "ハーツクライ産駒D", 3, "牡", "堀宣行"),
    ("HORSE_025", "ロードカナロア産駒E", 3, "牡", "手塚貴久"),
    ("HORSE_026", "エピファネイア産駒F", 3, "牝", "国枝栄"),
    ("HORSE_027", "ブラックタイド産駒G", 3, "牡", "音無秀孝"),
    ("HORSE_028", "サンデーサイレンス産駒H", 3, "牡", "藤沢和雄"),
    ("HORSE_029", "ステイゴールド産駒I", 5, "牡", "戸田博文"),
    ("HORSE_030", "スクリーンヒーロー産駒J", 5, "牡", "鹿戸雄一"),
]

SAMPLE_ENTRIES = [
    # RACE_20250419_01 (皐月賞) 8頭
    ("ENTRY_001", "RACE_20250419_01", "HORSE_001", 1, 1, "武豊", 57.0, 3.2, 2, "1着,2着,1着,3着,1着"),
    ("ENTRY_002", "RACE_20250419_01", "HORSE_004", 2, 2, "横山武史", 57.0, 2.1, 1, "1着,1着,2着,1着,1着"),
    ("ENTRY_003", "RACE_20250419_01", "HORSE_005", 3, 3, "松山弘平", 57.0, 5.6, 3, "2着,1着,3着,2着,1着"),
    ("ENTRY_004", "RACE_20250419_01", "HORSE_006", 4, 4, "戸崎圭太", 57.0, 8.9, 4, "3着,2着,4着,1着,2着"),
    ("ENTRY_005", "RACE_20250419_01", "HORSE_007", 5, 5, "川田将雅", 57.0, 12.3, 5, "4着,3着,2着,5着,3着"),
    ("ENTRY_006", "RACE_20250419_01", "HORSE_008", 6, 6, "池添謙一", 57.0, 18.7, 6, "5着,4着,6着,4着,4着"),
    ("ENTRY_007", "RACE_20250419_01", "HORSE_021", 7, 7, "岩田康誠", 57.0, 25.4, 7, "6着,6着,5着,7着,5着"),
    ("ENTRY_008", "RACE_20250419_01", "HORSE_022", 8, 8, "和田竜二", 57.0, 45.2, 8, "7着,7着,8着,6着,7着"),
    # RACE_20250419_02 (中山9R) 10頭
    ("ENTRY_009", "RACE_20250419_02", "HORSE_023", 1, 1, "三浦皇成", 54.0, 4.5, 2, "2着,1着,3着,2着,1着"),
    ("ENTRY_010", "RACE_20250419_02", "HORSE_024", 2, 2, "丸山元気", 55.0, 3.1, 1, "1着,2着,1着,1着,2着"),
    ("ENTRY_011", "RACE_20250419_02", "HORSE_025", 3, 3, "内田博幸", 55.0, 7.8, 3, "3着,4着,2着,3着,3着"),
    ("ENTRY_012", "RACE_20250419_02", "HORSE_026", 4, 4, "北村友一", 54.0, 11.2, 4, "4着,3着,5着,4着,4着"),
    ("ENTRY_013", "RACE_20250419_02", "HORSE_027", 5, 5, "田辺裕信", 55.0, 15.6, 5, "5着,5着,4着,5着,5着"),
    ("ENTRY_014", "RACE_20250419_02", "HORSE_028", 6, 6, "菅原明良", 55.0, 22.4, 6, "6着,7着,7着,6着,6着"),
    ("ENTRY_015", "RACE_20250419_02", "HORSE_029", 7, 7, "津村明秀", 57.0, 28.9, 7, "7着,6着,6着,7着,8着"),
    ("ENTRY_016", "RACE_20250419_02", "HORSE_030", 8, 8, "江田照男", 57.0, 35.1, 8, "8着,8着,8着,8着,7着"),
    ("ENTRY_017", "RACE_20250419_02", "HORSE_009", 9, 9, "横山典弘", 57.0, 42.3, 9, "9着,9着,9着,9着,9着"),
    ("ENTRY_018", "RACE_20250419_02", "HORSE_010", 10, 10, "石橋脩", 57.0, 55.7, 10, "10着,10着,10着,10着,10着"),
    # RACE_20250419_03 (阪神大賞典) 8頭
    ("ENTRY_019", "RACE_20250419_03", "HORSE_017", 1, 1, "松山弘平", 58.0, 2.8, 1, "1着,1着,2着,1着,1着"),
    ("ENTRY_020", "RACE_20250419_03", "HORSE_018", 2, 2, "川田将雅", 58.0, 4.1, 2, "2着,2着,1着,2着,2着"),
    ("ENTRY_021", "RACE_20250419_03", "HORSE_019", 3, 3, "岩田望来", 58.0, 6.5, 3, "3着,3着,3着,3着,3着"),
    ("ENTRY_022", "RACE_20250419_03", "HORSE_020", 4, 4, "浜中俊", 58.0, 9.3, 4, "4着,4着,4着,4着,4着"),
    ("ENTRY_023", "RACE_20250419_03", "HORSE_016", 5, 5, "幸英明", 58.0, 14.2, 5, "5着,5着,5着,5着,5着"),
    ("ENTRY_024", "RACE_20250419_03", "HORSE_002", 6, 6, "C.ルメール", 58.0, 18.9, 6, "6着,6着,6着,6着,6着"),
    ("ENTRY_025", "RACE_20250419_03", "HORSE_008", 7, 7, "池添謙一", 58.0, 24.7, 7, "7着,7着,7着,7着,7着"),
    ("ENTRY_026", "RACE_20250419_03", "HORSE_010", 8, 8, "石橋脩", 58.0, 38.4, 8, "8着,8着,8着,8着,8着"),
    # RACE_20250420_01 (フローラS) 10頭
    ("ENTRY_027", "RACE_20250420_01", "HORSE_003", 1, 1, "川田将雅", 55.0, 1.9, 1, "1着,1着,1着,1着,2着"),
    ("ENTRY_028", "RACE_20250420_01", "HORSE_011", 2, 2, "武豊", 55.0, 4.3, 2, "2着,1着,2着,2着,1着"),
    ("ENTRY_029", "RACE_20250420_01", "HORSE_012", 3, 3, "横山武史", 55.0, 6.7, 3, "3着,2着,3着,1着,3着"),
    ("ENTRY_030", "RACE_20250420_01", "HORSE_013", 4, 4, "戸崎圭太", 55.0, 10.5, 4, "4着,3착,4着,3着,4着"),
    ("ENTRY_031", "RACE_20250420_01", "HORSE_014", 5, 5, "C.ルメール", 55.0, 15.8, 5, "5着,5着,5着,5着,5着"),
    ("ENTRY_032", "RACE_20250420_01", "HORSE_015", 6, 6, "岩田康誠", 55.0, 20.4, 6, "6着,4착,6着,4着,6着"),
    ("ENTRY_033", "RACE_20250420_01", "HORSE_023", 7, 7, "北村友一", 55.0, 28.9, 7, "7着,6着,7着,6着,7着"),
    ("ENTRY_034", "RACE_20250420_01", "HORSE_026", 8, 8, "丸山元気", 55.0, 35.6, 8, "8着,7着,8着,7着,8着"),
    ("ENTRY_035", "RACE_20250420_01", "HORSE_028", 9, 9, "田辺裕信", 55.0, 48.2, 9, "9着,8着,9着,8着,9着"),
    ("ENTRY_036", "RACE_20250420_01", "HORSE_030", 10, 10, "江田照男", 55.0, 62.7, 10, "10着,9着,10착,9着,10着"),
    # RACE_20250420_02 (ゆりかもめ賞) 8頭
    ("ENTRY_037", "RACE_20250420_02", "HORSE_024", 1, 1, "内田博幸", 56.0, 5.2, 2, "2着,1着,2着,2着,1着"),
    ("ENTRY_038", "RACE_20250420_02", "HORSE_025", 2, 2, "三浦皇成", 56.0, 3.8, 1, "1着,2着,1着,1着,2着"),
    ("ENTRY_039", "RACE_20250420_02", "HORSE_027", 3, 3, "菅原明良", 56.0, 8.4, 3, "3着,3着,3着,3着,3着"),
    ("ENTRY_040", "RACE_20250420_02", "HORSE_029", 4, 4, "津村明秀", 57.0, 12.6, 4, "4着,4着,4着,4着,4着"),
    ("ENTRY_041", "RACE_20250420_02", "HORSE_030", 5, 5, "石橋脩", 57.0, 18.9, 5, "5着,5着,5着,5着,5着"),
    ("ENTRY_042", "RACE_20250420_02", "HORSE_009", 6, 6, "横山典弘", 57.0, 25.3, 6, "6着,6着,6着,6着,6着"),
    ("ENTRY_043", "RACE_20250420_02", "HORSE_010", 7, 7, "和田竜二", 57.0, 33.7, 7, "7着,7着,7着,7着,7着"),
    ("ENTRY_044", "RACE_20250420_02", "HORSE_016", 8, 8, "幸英明", 57.0, 47.1, 8, "8着,8着,8着,8着,8着"),
]

DEFAULT_SETTINGS = [
    ("weight_recent_results", "30"),
    ("weight_odds", "20"),
    ("weight_distance", "15"),
    ("weight_jockey", "15"),
    ("weight_gate", "10"),
    ("weight_manual", "10"),
    ("default_mode", "standard"),
    ("target_min_odds", "2.0"),
    ("target_max_odds", "50.0"),
    ("budget_per_race", "3000"),
    ("enable_notifications", "true"),
    ("dark_mode", "true"),
    ("notify_mac", "true"),
    ("notify_email", "false"),
    ("notification_email", ""),
    ("gmail_app_password", ""),
    ("alarm_minutes_before", "30"),
]


async def init_db():
    print(f"DBパス: {DB_PATH}")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        for stmt in CREATE_TABLES_SQL.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                await conn.execute(text(stmt))
        print("テーブル作成完了")

        # is_win5カラムがない既存DBへのマイグレーション
        try:
            await conn.execute(text("ALTER TABLE races ADD COLUMN is_win5 INTEGER DEFAULT 0"))
        except Exception:
            pass  # already exists

        # races
        for r in SAMPLE_RACES:
            await conn.execute(text("""
                INSERT OR IGNORE INTO races
                (race_id, race_name, race_date, venue, race_number, distance, surface, grade, race_class, prize_money, is_win5)
                VALUES (:race_id, :race_name, :race_date, :venue, :race_number, :distance, :surface, :grade, :race_class, :prize_money, :is_win5)
            """), {
                "race_id": r[0], "race_name": r[1], "race_date": r[2],
                "venue": r[3], "race_number": r[4], "distance": r[5],
                "surface": r[6], "grade": r[7], "race_class": r[8], "prize_money": r[9],
                "is_win5": r[10],
            })
        # 既存行のis_win5も更新
        for r in SAMPLE_RACES:
            await conn.execute(
                text("UPDATE races SET is_win5 = :is_win5 WHERE race_id = :race_id"),
                {"race_id": r[0], "is_win5": r[10]},
            )
        print(f"レース {len(SAMPLE_RACES)} 件投入")

        # horses
        for h in SAMPLE_HORSES:
            await conn.execute(text("""
                INSERT OR IGNORE INTO horses (horse_id, horse_name, age, sex, trainer)
                VALUES (:horse_id, :horse_name, :age, :sex, :trainer)
            """), {
                "horse_id": h[0], "horse_name": h[1], "age": h[2],
                "sex": h[3], "trainer": h[4],
            })
        print(f"馬 {len(SAMPLE_HORSES)} 頭投入")

        # entries
        for e in SAMPLE_ENTRIES:
            await conn.execute(text("""
                INSERT OR IGNORE INTO entries
                (entry_id, race_id, horse_id, horse_number, gate_number, jockey,
                 weight_carried, odds, popularity, recent_results)
                VALUES (:entry_id, :race_id, :horse_id, :horse_number, :gate_number,
                        :jockey, :weight_carried, :odds, :popularity, :recent_results)
            """), {
                "entry_id": e[0], "race_id": e[1], "horse_id": e[2],
                "horse_number": e[3], "gate_number": e[4], "jockey": e[5],
                "weight_carried": e[6], "odds": e[7], "popularity": e[8],
                "recent_results": e[9],
            })
        print(f"エントリー {len(SAMPLE_ENTRIES)} 件投入")

        # settings
        for s in DEFAULT_SETTINGS:
            await conn.execute(text("""
                INSERT OR IGNORE INTO settings (key, value)
                VALUES (:key, :value)
            """), {"key": s[0], "value": s[1]})
        print(f"設定 {len(DEFAULT_SETTINGS)} 件投入")

    print("DB初期化完了")


if __name__ == "__main__":
    asyncio.run(init_db())
