from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import get_db
from app.services import db_service
from app.models.schemas import SettingsModel

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _parse_settings(raw: dict) -> SettingsModel:
    return SettingsModel(
        weight_recent_results=int(raw.get("weight_recent_results", 30)),
        weight_odds=int(raw.get("weight_odds", 20)),
        weight_distance=int(raw.get("weight_distance", 15)),
        weight_jockey=int(raw.get("weight_jockey", 15)),
        weight_gate=int(raw.get("weight_gate", 10)),
        weight_manual=int(raw.get("weight_manual", 10)),
        default_mode=raw.get("default_mode", "standard"),
        target_min_odds=float(raw.get("target_min_odds", 2.0)),
        target_max_odds=float(raw.get("target_max_odds", 50.0)),
        budget_per_race=int(raw.get("budget_per_race", 3000)),
        enable_notifications=raw.get("enable_notifications", "true").lower() == "true",
        dark_mode=raw.get("dark_mode", "true").lower() == "true",
    )


@router.get("", response_model=SettingsModel)
async def get_settings(db: AsyncSession = Depends(get_db)):
    raw = await db_service.get_settings(db)
    return _parse_settings(raw)


@router.put("", response_model=SettingsModel)
async def update_settings(body: SettingsModel, db: AsyncSession = Depends(get_db)):
    data = body.model_dump()
    flat = {k: str(v) for k, v in data.items()}
    await db_service.update_settings(db, flat)
    return body
