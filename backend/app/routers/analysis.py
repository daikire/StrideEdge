from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database.db import get_db
from app.services import db_service
from app.services.analysis_service import calculate_scores
from app.services.ticket_service import generate_suggestions
from app.models.schemas import (
    AnalysisResult, TicketSuggestion, PredictionMode, ManualCorrectionInput
)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# セッションごとの手動補正を一時保存（本番はDBに永続化）
_manual_corrections: dict = {}


@router.get("/{race_id}", response_model=List[AnalysisResult])
async def get_analysis(
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

    corrections = _manual_corrections.get(race_id, {})
    results = calculate_scores(entries, race, corrections)
    return results


@router.get("/{race_id}/tickets", response_model=List[TicketSuggestion])
async def get_ticket_suggestions(
    race_id: str,
    mode: PredictionMode = Query(PredictionMode.standard),
    budget: int = Query(3000),
    db: AsyncSession = Depends(get_db),
):
    race = await db_service.get_race_by_id(db, race_id)
    if not race:
        raise HTTPException(status_code=404, detail="レースが見つかりません")

    entries = await db_service.get_entries_by_race(db, race_id)
    if not entries:
        raise HTTPException(status_code=404, detail="出走馬情報がありません")

    corrections = _manual_corrections.get(race_id, {})
    analysis_results = calculate_scores(entries, race, corrections)

    entries_map = {e["horse_id"]: e for e in entries}
    suggestions = generate_suggestions(race_id, analysis_results, mode, budget, entries_map)
    return suggestions


@router.post("/{race_id}/manual-correction")
async def manual_correction(
    race_id: str,
    body: ManualCorrectionInput,
    db: AsyncSession = Depends(get_db),
):
    race = await db_service.get_race_by_id(db, race_id)
    if not race:
        raise HTTPException(status_code=404, detail="レースが見つかりません")

    if race_id not in _manual_corrections:
        _manual_corrections[race_id] = {}
    _manual_corrections[race_id][body.horse_id] = body.correction_value

    return {"message": "手動補正を適用しました", "horse_id": body.horse_id, "value": body.correction_value}


@router.delete("/{race_id}/manual-correction")
async def clear_manual_correction(race_id: str):
    _manual_corrections.pop(race_id, None)
    return {"message": "手動補正をクリアしました"}
