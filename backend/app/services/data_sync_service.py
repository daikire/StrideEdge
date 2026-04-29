"""
DataSyncService — netkeiba からのデータ取得・保存オーケストレーター。
Scraper と Repository を呼び出すのみ。DB 構造も HTML 構造も知らない。
"""
import asyncio
import logging
from dataclasses import dataclass, field

from sqlalchemy import text

from app.database.db import AsyncSessionLocal
from app.scrapers.netkeiba_scraper import NetkeibaScraper, BlockDetectedError
from app.repositories.race_repository import save_race
from app.services.db_service import update_win5_flags

logger = logging.getLogger(__name__)

_sync_lock = asyncio.Lock()

_RACE_LIST_URL = "https://race.netkeiba.com/top/race_list_sub.html?kaisai_date={date}"
_ENTRIES_URL = "https://race.netkeiba.com/race/shutuba.html?race_id={race_id}"


@dataclass
class SyncResult:
    status: str
    races_fetched: int = 0
    entries_fetched: int = 0
    errors: list[str] = field(default_factory=list)


async def sync_races(date: str) -> SyncResult:
    """
    指定日のレース情報を netkeiba から取得して DB に保存する。
    同時実行は asyncio.Lock で防止。Lock 取得失敗時は RuntimeError("409") を raise。
    """
    if _sync_lock.locked():
        raise RuntimeError("409")

    async with _sync_lock:
        result = SyncResult(status="running")
        log_id: int | None = None
        date_nodash = date.replace("-", "")

        async with AsyncSessionLocal() as session:
            row = await session.execute(text("""
                INSERT INTO scrape_logs (target_date, url, status)
                VALUES (:date, :url, 'running')
            """), {"date": date, "url": _RACE_LIST_URL.format(date=date_nodash)})
            await session.commit()
            log_id = row.lastrowid

        scraper = NetkeibaScraper()

        try:
            html = await scraper.fetch_html(_RACE_LIST_URL.format(date=date_nodash))
            races = scraper.parse_race_list(html, date)
            result.races_fetched = len(races)
            logger.info("レース一覧取得: %d 件 (date=%s)", len(races), date)

            for race in races:
                try:
                    entries_html = await scraper.fetch_html(
                        _ENTRIES_URL.format(race_id=race.race_id)
                    )
                    entries = scraper.parse_entries(entries_html, race.race_id)
                    async with AsyncSessionLocal() as session:
                        await save_race(race, entries, session)
                    result.entries_fetched += len(entries)

                except BlockDetectedError as e:
                    msg = f"ブロック検知: {e}"
                    result.errors.append(msg)
                    logger.warning(msg)
                    result.status = "block_detected"
                    break
                except Exception as e:
                    msg = f"race_id={race.race_id}: {e}"
                    result.errors.append(msg)
                    logger.error("レース保存エラー: %s", e)

            if result.status == "running":
                result.status = "partial" if result.errors else "success"
                # WIN5候補フラグを更新（ヒューリスティック）
                async with AsyncSessionLocal() as session:
                    await update_win5_flags(session, date)

        except BlockDetectedError as e:
            result.status = "block_detected"
            result.errors.append(str(e))
            logger.warning("ブロック検知（レース一覧）: %s", e)
        except Exception as e:
            result.status = "error"
            result.errors.append(str(e))
            logger.error("同期エラー: %s", e)
        finally:
            if log_id:
                async with AsyncSessionLocal() as session:
                    await session.execute(text("""
                        UPDATE scrape_logs
                        SET status          = :status,
                            races_fetched   = :races,
                            entries_fetched = :entries,
                            error_message   = :err
                        WHERE id = :id
                    """), {
                        "status":  result.status,
                        "races":   result.races_fetched,
                        "entries": result.entries_fetched,
                        "err":     ("; ".join(result.errors)[:1000] if result.errors else None),
                        "id":      log_id,
                    })
                    await session.commit()

        return result
