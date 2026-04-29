"""
SyncRouter — 手動データ同期トリガーと scrape_logs 参照。
POST /api/sync/races?date=YYYY-MM-DD  手動取得
GET  /api/sync/logs                   取得履歴
"""
import re
import logging
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from app.database.db import AsyncSessionLocal
from app.services.data_sync_service import sync_races

logger = logging.getLogger(__name__)
router = APIRouter()

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@router.post("/api/sync/races")
async def trigger_sync(date: str = Query(..., description="取得対象日（YYYY-MM-DD）")):
    if not _DATE_RE.match(date):
        raise HTTPException(status_code=400, detail="date は YYYY-MM-DD 形式で指定してください")

    try:
        result = await sync_races(date)
    except RuntimeError:
        raise HTTPException(status_code=409, detail="同期が既に実行中です")

    return {
        "status":          result.status,
        "races_fetched":   result.races_fetched,
        "entries_fetched": result.entries_fetched,
        "errors":          result.errors,
    }


@router.get("/api/sync/logs")
async def get_sync_logs(limit: int = Query(20, ge=1, le=100)):
    async with AsyncSessionLocal() as session:
        rows = await session.execute(text("""
            SELECT id, target_date, url, status,
                   races_fetched, entries_fetched, error_message, scraped_at
            FROM scrape_logs
            ORDER BY scraped_at DESC
            LIMIT :limit
        """), {"limit": limit})
        logs = [dict(r._mapping) for r in rows]
    return {"logs": logs}
