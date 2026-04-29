from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database.db import get_db
from app.models.schemas import HorseInfo

router = APIRouter(prefix="/api/horses", tags=["horses"])


@router.get("/{horse_id}", response_model=HorseInfo)
async def get_horse(horse_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM horses WHERE horse_id = :hid"),
        {"hid": horse_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="馬が見つかりません")
    return dict(row._mapping)
