"""
RaceRepository — races / horses / entries テーブルへの保存。
1レース = 1トランザクション。部分失敗時は自動ロールバック。
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.models.scraper_models import ScrapedRace, ScrapedEntry

logger = logging.getLogger(__name__)


async def save_race(
    race: ScrapedRace,
    entries: list[ScrapedEntry],
    session: AsyncSession,
) -> int:
    """1レース分のデータをDBに保存する。返り値は保存したエントリー数。"""
    async with session.begin():
        await session.execute(text("""
            INSERT INTO races
                (race_id, race_name, race_date, venue, race_number, distance, surface, grade, race_class)
            VALUES
                (:race_id, :race_name, :race_date, :venue, :race_number, :distance, :surface, :grade, :race_class)
            ON CONFLICT(race_id) DO UPDATE SET
                race_name     = excluded.race_name,
                race_date     = excluded.race_date,
                venue         = excluded.venue,
                race_number   = excluded.race_number,
                distance      = excluded.distance,
                surface       = excluded.surface,
                grade         = excluded.grade,
                race_class    = excluded.race_class
        """), {
            "race_id":      race.race_id,
            "race_name":    race.race_name,
            "race_date":    race.race_date,
            "venue":        race.venue,
            "race_number":  race.race_number,
            "distance":     race.distance,
            "surface":      race.surface,
            "grade":        race.grade,
            "race_class":   race.race_class,
        })

        for entry in entries:
            await session.execute(text("""
                INSERT INTO horses (horse_id, horse_name)
                VALUES (:horse_id, :horse_name)
                ON CONFLICT(horse_id) DO UPDATE SET horse_name = excluded.horse_name
            """), {"horse_id": entry.horse_id, "horse_name": entry.horse_name})

        # 既存エントリーを削除してから一括挿入（冪等性保証）
        await session.execute(
            text("DELETE FROM entries WHERE race_id = :race_id"),
            {"race_id": race.race_id},
        )

        for entry in entries:
            entry_id = f"{race.race_id}_{entry.horse_number:02d}"
            await session.execute(text("""
                INSERT INTO entries
                    (entry_id, race_id, horse_id, horse_number, gate_number, jockey,
                     weight_carried, odds, popularity, recent_results,
                     horse_weight, horse_weight_diff)
                VALUES
                    (:entry_id, :race_id, :horse_id, :horse_number, :gate_number, :jockey,
                     :weight_carried, :odds, :popularity, :recent_results,
                     :horse_weight, :horse_weight_diff)
            """), {
                "entry_id":         entry_id,
                "race_id":          entry.race_id,
                "horse_id":         entry.horse_id,
                "horse_number":     entry.horse_number,
                "gate_number":      entry.gate_number,
                "jockey":           entry.jockey,
                "weight_carried":   entry.weight_carried,
                "odds":             entry.odds,
                "popularity":       entry.popularity,
                "recent_results":   entry.recent_results,
                "horse_weight":     entry.horse_weight,
                "horse_weight_diff": entry.horse_weight_diff,
            })

    logger.info("保存完了: race_id=%s entries=%d", race.race_id, len(entries))
    return len(entries)
