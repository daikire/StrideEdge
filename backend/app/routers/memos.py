from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.database.db import get_db
from app.services import db_service

router = APIRouter(prefix="/api/memos", tags=["memos"])


class MemoInput(BaseModel):
    memo: str


@router.get("/{race_id}")
async def get_memo(race_id: str, db: AsyncSession = Depends(get_db)):
    memo = await db_service.get_memo(db, race_id)
    return {"race_id": race_id, "memo": memo}


@router.put("/{race_id}")
async def save_memo(race_id: str, body: MemoInput, db: AsyncSession = Depends(get_db)):
    await db_service.save_memo(db, race_id, body.memo)
    return {"race_id": race_id, "memo": body.memo}
