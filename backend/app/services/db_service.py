"""DB操作サービス"""
import json
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def get_races_by_date(db: AsyncSession, date_str: str) -> List[Dict]:
    result = await db.execute(
        text("SELECT * FROM races WHERE race_date = :d ORDER BY race_number"),
        {"d": date_str},
    )
    return [dict(r._mapping) for r in result.fetchall()]


async def get_win5_races(db: AsyncSession, date_str: str) -> List[Dict]:
    """WIN5候補レースを返す（ヒューリスティック: race_number >= 10 の上位5件）"""
    result = await db.execute(
        text("""
            SELECT * FROM races
            WHERE race_date = :d
              AND race_number >= 10
            ORDER BY race_number DESC
            LIMIT 5
        """),
        {"d": date_str},
    )
    return [dict(r._mapping) for r in result.fetchall()]


async def update_win5_flags(db: AsyncSession, date_str: str) -> None:
    """同期後に当日の WIN5 候補フラグを更新する"""
    await db.execute(
        text("UPDATE races SET is_win5 = 0 WHERE race_date = :d"),
        {"d": date_str},
    )
    await db.execute(
        text("""
            UPDATE races SET is_win5 = 1
            WHERE race_id IN (
                SELECT race_id FROM races
                WHERE race_date = :d AND race_number >= 10
                ORDER BY race_number DESC
                LIMIT 5
            )
        """),
        {"d": date_str},
    )
    await db.commit()


async def get_all_race_dates(db: AsyncSession) -> List[str]:
    result = await db.execute(
        text("SELECT DISTINCT race_date FROM races ORDER BY race_date DESC")
    )
    return [r[0] for r in result.fetchall()]


async def get_race_by_id(db: AsyncSession, race_id: str) -> Optional[Dict]:
    result = await db.execute(
        text("SELECT * FROM races WHERE race_id = :rid"),
        {"rid": race_id},
    )
    row = result.fetchone()
    return dict(row._mapping) if row else None


async def get_entries_by_race(db: AsyncSession, race_id: str) -> List[Dict]:
    result = await db.execute(
        text("""
            SELECT e.*, h.horse_name, h.age, h.sex, h.trainer
            FROM entries e
            LEFT JOIN horses h ON e.horse_id = h.horse_id
            WHERE e.race_id = :rid
            ORDER BY e.horse_number
        """),
        {"rid": race_id},
    )
    return [dict(r._mapping) for r in result.fetchall()]


async def get_settings(db: AsyncSession) -> Dict[str, str]:
    result = await db.execute(text("SELECT key, value FROM settings"))
    return {r[0]: r[1] for r in result.fetchall()}


async def update_settings(db: AsyncSession, settings: Dict[str, Any]) -> bool:
    for key, value in settings.items():
        await db.execute(
            text("""
                INSERT INTO settings (key, value, updated_at)
                VALUES (:key, :value, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value=:value, updated_at=CURRENT_TIMESTAMP
            """),
            {"key": key, "value": str(value)},
        )
    await db.commit()
    return True


async def save_prediction(db: AsyncSession, data: Dict) -> int:
    result = await db.execute(
        text("""
            INSERT INTO predictions (race_id, mode, ticket_type, buy_candidates, total_budget, memo)
            VALUES (:race_id, :mode, :ticket_type, :buy_candidates, :total_budget, :memo)
        """),
        {
            "race_id": data["race_id"],
            "mode": data.get("mode", "standard"),
            "ticket_type": data.get("ticket_type", ""),
            "buy_candidates": json.dumps(data.get("buy_candidates", []), ensure_ascii=False),
            "total_budget": data.get("total_budget", 0),
            "memo": data.get("memo", ""),
        },
    )
    await db.commit()
    return result.lastrowid


async def get_predictions(db: AsyncSession) -> List[Dict]:
    result = await db.execute(
        text("""
            SELECT p.*, r.race_name
            FROM predictions p
            LEFT JOIN races r ON p.race_id = r.race_id
            ORDER BY p.created_at DESC
        """)
    )
    rows = []
    for r in result.fetchall():
        d = dict(r._mapping)
        try:
            d["buy_candidates"] = json.loads(d.get("buy_candidates", "[]"))
        except Exception:
            d["buy_candidates"] = []
        rows.append(d)
    return rows


async def save_race_result(db: AsyncSession, data: Dict) -> int:
    result = await db.execute(
        text("""
            INSERT OR REPLACE INTO race_results
            (race_id, first_place, second_place, third_place, fourth_place, result_detail)
            VALUES (:race_id, :first_place, :second_place, :third_place, :fourth_place, :result_detail)
        """),
        {
            "race_id": data["race_id"],
            "first_place": data.get("first_place", ""),
            "second_place": data.get("second_place", ""),
            "third_place": data.get("third_place", ""),
            "fourth_place": data.get("fourth_place", ""),
            "result_detail": json.dumps(data.get("result_detail", {}), ensure_ascii=False),
        },
    )
    await db.commit()
    return result.lastrowid


async def get_race_results(db: AsyncSession) -> List[Dict]:
    result = await db.execute(
        text("""
            SELECT rr.*, r.race_name, r.race_date, r.venue
            FROM race_results rr
            LEFT JOIN races r ON rr.race_id = r.race_id
            ORDER BY rr.registered_at DESC
        """)
    )
    return [dict(r._mapping) for r in result.fetchall()]


async def get_memo(db: AsyncSession, race_id: str) -> str:
    result = await db.execute(
        text("SELECT memo FROM race_memos WHERE race_id = :rid"), {"rid": race_id}
    )
    row = result.fetchone()
    return row[0] if row else ""


async def save_memo(db: AsyncSession, race_id: str, memo: str) -> None:
    await db.execute(
        text("""
            INSERT INTO race_memos (race_id, memo, updated_at)
            VALUES (:race_id, :memo, CURRENT_TIMESTAMP)
            ON CONFLICT(race_id) DO UPDATE SET memo = :memo, updated_at = CURRENT_TIMESTAMP
        """),
        {"race_id": race_id, "memo": memo},
    )
    await db.commit()


async def get_roi_data(db: AsyncSession) -> List[Dict]:
    result = await db.execute(text("""
        SELECT
            p.id, p.race_id, p.mode, p.ticket_type,
            p.buy_candidates, p.total_budget, p.created_at,
            r.race_name, r.race_date, r.venue,
            rr.first_place, rr.second_place, rr.third_place
        FROM predictions p
        LEFT JOIN races r ON p.race_id = r.race_id
        LEFT JOIN race_results rr ON p.race_id = rr.race_id
        ORDER BY p.created_at DESC
    """))
    rows = []
    for row in result.fetchall():
        d = dict(row._mapping)
        try:
            d["buy_candidates"] = json.loads(d.get("buy_candidates", "[]"))
        except Exception:
            d["buy_candidates"] = []
        rows.append(d)
    return rows


async def get_races_by_month(db: AsyncSession, year: int, month: int) -> List[Dict]:
    month_str = f"{year:04d}-{month:02d}"
    result = await db.execute(
        text("""
            SELECT race_date, venue, grade, is_win5,
                   COUNT(*) as race_count,
                   GROUP_CONCAT(race_name, '||') as race_names,
                   GROUP_CONCAT(race_id, '||') as race_ids
            FROM races
            WHERE race_date LIKE :prefix
            GROUP BY race_date, venue
            ORDER BY race_date, venue
        """),
        {"prefix": f"{month_str}%"},
    )
    rows = []
    for r in result.fetchall():
        d = dict(r._mapping)
        d["race_names"] = d["race_names"].split("||") if d["race_names"] else []
        d["race_ids"] = d["race_ids"].split("||") if d["race_ids"] else []
        rows.append(d)
    return rows
