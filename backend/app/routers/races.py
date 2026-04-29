from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database.db import get_db
from app.services import db_service
from app.models.schemas import RaceInfo, EntryInfo

router = APIRouter(prefix="/api/races", tags=["races"])


@router.get("", response_model=List[RaceInfo])
async def list_races(
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    if date:
        races = await db_service.get_races_by_date(db, date)
    else:
        dates = await db_service.get_all_race_dates(db)
        if not dates:
            return []
        races = await db_service.get_races_by_date(db, dates[0])
    return races


@router.get("/dates")
async def list_race_dates(db: AsyncSession = Depends(get_db)):
    dates = await db_service.get_all_race_dates(db)
    return {"dates": dates}


@router.get("/calendar/{year}/{month}")
async def get_calendar(year: int, month: int, db: AsyncSession = Depends(get_db)):
    rows = await db_service.get_races_by_month(db, year, month)
    return {"year": year, "month": month, "race_days": rows}


@router.get("/win5")
async def get_win5_races(
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    if not date:
        dates = await db_service.get_all_race_dates(db)
        date = dates[0] if dates else None
    if not date:
        return {"date": None, "races": []}
    races = await db_service.get_win5_races(db, date)
    return {"date": date, "races": races}


@router.get("/{race_id}", response_model=RaceInfo)
async def get_race(race_id: str, db: AsyncSession = Depends(get_db)):
    race = await db_service.get_race_by_id(db, race_id)
    if not race:
        raise HTTPException(status_code=404, detail="レースが見つかりません")
    return race


@router.get("/{race_id}/entries", response_model=List[EntryInfo])
async def get_entries(race_id: str, db: AsyncSession = Depends(get_db)):
    race = await db_service.get_race_by_id(db, race_id)
    if not race:
        raise HTTPException(status_code=404, detail="レースが見つかりません")
    entries = await db_service.get_entries_by_race(db, race_id)
    return entries
