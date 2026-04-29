"""
予想一覧ルーター
GET /api/predictions/daily — 指定日の全レースに対して有力候補・逆穴場・買い目を返す
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from app.database.db import get_db
from app.services import db_service
from app.services.analysis_service import calculate_scores
from app.services.ticket_service import generate_suggestions
from app.models.schemas import (
    RaceInfo, AnalysisResult, TicketSuggestion, PredictionMode
)

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


class DarkHorse(BaseModel):
    horse_name: str
    horse_number: int
    odds: Optional[float]
    total_score: float
    rank: int
    reason: str


class DailyRacePrediction(BaseModel):
    race: RaceInfo
    favorites: List[AnalysisResult]   # スコア上位3頭（有力候補）
    dark_horses: List[AnalysisResult]  # 逆穴場（高オッズ・それなりのスコア）
    tickets: List[TicketSuggestion]
    win5_pick: Optional[AnalysisResult] = None  # Win5用 最上位1頭


def _find_dark_horses(
    analysis: List[AnalysisResult],
    entries_map: dict,
    n: int = 2,
) -> List[AnalysisResult]:
    """
    逆穴場の定義:
    - オッズ15倍以上（人気薄）
    - 全馬中 スコアが上位50%以内
    - スコア上位3位には入っていない
    """
    total = len(analysis)
    if total == 0:
        return []

    threshold_rank = max(total // 2, 4)  # 上位50% or 4位以内

    dark = []
    for r in analysis:
        if r.rank <= 3:
            continue  # 有力候補はスキップ
        entry = entries_map.get(r.horse_id, {})
        odds = entry.get("odds") or 0
        if odds >= 15.0 and r.rank <= threshold_rank:
            dark.append(r)
        if len(dark) >= n:
            break

    return dark


@router.get("/daily", response_model=List[DailyRacePrediction])
async def get_daily_predictions(
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    mode: PredictionMode = Query(PredictionMode.standard),
    budget: int = Query(3000),
    db: AsyncSession = Depends(get_db),
):
    # 日付が未指定なら最新日
    if not date:
        dates = await db_service.get_all_race_dates(db)
        if not dates:
            return []
        date = dates[0]

    races = await db_service.get_races_by_date(db, date)
    if not races:
        return []

    result = []
    for race_dict in races:
        race_id = race_dict["race_id"]
        entries = await db_service.get_entries_by_race(db, race_id)
        if not entries:
            continue

        analysis = calculate_scores(entries, race_dict)
        entries_map = {e["horse_id"]: e for e in entries}

        favorites = analysis[:3]
        dark_horses = _find_dark_horses(analysis, entries_map)
        tickets = generate_suggestions(race_id, analysis, mode, budget, entries_map)
        is_win5 = bool(race_dict.get("is_win5", 0))
        win5_pick = analysis[0] if (is_win5 and analysis) else None

        race_info = RaceInfo(**{k: race_dict[k] for k in RaceInfo.model_fields if k in race_dict})

        result.append(DailyRacePrediction(
            race=race_info,
            favorites=favorites,
            dark_horses=dark_horses,
            tickets=tickets,
            win5_pick=win5_pick,
        ))

    return result
