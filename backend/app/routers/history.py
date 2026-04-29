from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database.db import get_db
from app.services import db_service
from app.models.schemas import PredictionInput, PredictionResponse, RaceResultInput, RaceResultResponse

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/predictions", response_model=List[PredictionResponse])
async def list_predictions(db: AsyncSession = Depends(get_db)):
    predictions = await db_service.get_predictions(db)
    results = []
    for p in predictions:
        results.append(PredictionResponse(
            id=p["id"],
            race_id=p["race_id"],
            race_name=p.get("race_name"),
            mode=p["mode"],
            ticket_type=p.get("ticket_type"),
            buy_candidates=p.get("buy_candidates", []),
            total_budget=p.get("total_budget", 0),
            memo=p.get("memo", ""),
            created_at=p["created_at"],
        ))
    return results


@router.post("/predictions", response_model=dict)
async def create_prediction(body: PredictionInput, db: AsyncSession = Depends(get_db)):
    race = await db_service.get_race_by_id(db, body.race_id)
    if not race:
        raise HTTPException(status_code=404, detail="レースが見つかりません")

    pred_id = await db_service.save_prediction(db, {
        "race_id": body.race_id,
        "mode": body.mode.value,
        "ticket_type": body.ticket_type.value if body.ticket_type else "",
        "buy_candidates": [c.model_dump() if hasattr(c, 'model_dump') else c for c in body.buy_candidates],
        "total_budget": body.total_budget,
        "memo": body.memo,
    })
    return {"id": pred_id, "message": "予想を保存しました"}


@router.get("/results", response_model=List[dict])
async def list_results(db: AsyncSession = Depends(get_db)):
    results = await db_service.get_race_results(db)
    return results


@router.post("/results", response_model=dict)
async def create_result(body: RaceResultInput, db: AsyncSession = Depends(get_db)):
    race = await db_service.get_race_by_id(db, body.race_id)
    if not race:
        raise HTTPException(status_code=404, detail="レースが見つかりません")

    result_id = await db_service.save_race_result(db, body.model_dump())
    return {"id": result_id, "message": "結果を登録しました"}
