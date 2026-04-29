from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database.db import get_db
from app.services import db_service
from app.services.analysis_service import calculate_scores
from app.services.edge_service import compute_edge_signal, compute_today_edge
from app.models.schemas import EdgeSignal, TodayEdge, PredictionMode

router = APIRouter(prefix="/api/edge", tags=["edge"])


@router.get("/today", response_model=TodayEdge)
async def get_today_edge(
    date: Optional[str] = Query(None),
    mode: PredictionMode = Query(PredictionMode.standard),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt
    target_date = date or dt.today().isoformat()
    races = await db_service.get_races_by_date(db, target_date)
    if not races:
        return TodayEdge(
            date=target_date,
            race_count=0,
            play_count=0,
            watch_count=0,
            caution_count=0,
            pass_count=0,
            risk_posture="NO DATA",
            risk_reason="対象日のレースデータがありません",
        )

    analyses: dict = {}
    for race in races:
        race_id = race["race_id"]
        entries = await db_service.get_entries_by_race(db, race_id)
        if entries:
            results = calculate_scores(entries, race, {})
            analyses[race_id] = results

    return compute_today_edge(races, analyses)


@router.get("/{race_id}", response_model=EdgeSignal)
async def get_edge_signal(
    race_id: str,
    mode: PredictionMode = Query(PredictionMode.standard),
    db: AsyncSession = Depends(get_db),
):
    race = await db_service.get_race_by_id(db, race_id)
    if not race:
        raise HTTPException(status_code=404, detail="レースが見つかりません")
    entries = await db_service.get_entries_by_race(db, race_id)
    if not entries:
        raise HTTPException(status_code=404, detail="出走馬情報がありません")
    results = calculate_scores(entries, race, {})
    return compute_edge_signal(results, race_id)
