"""アラーム CRUD ルーター"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from app.database.db import get_db

router = APIRouter(prefix="/api/alarms", tags=["alarms"])


class AlarmCreate(BaseModel):
    race_id: str
    race_name: str
    race_date: str
    race_time: str = "15:30"
    minutes_before: int = 30
    notify_mac: bool = True
    notify_email: bool = True


class AlarmResponse(BaseModel):
    id: int
    race_id: str
    race_name: str
    race_date: str
    race_time: str
    minutes_before: int
    notify_mac: bool
    notify_email: bool
    fired: bool
    created_at: str


@router.get("", response_model=List[AlarmResponse])
async def list_alarms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM alarms ORDER BY race_date, race_time")
    )
    rows = []
    for r in result.fetchall():
        d = dict(r._mapping)
        d["notify_mac"]   = bool(d["notify_mac"])
        d["notify_email"] = bool(d["notify_email"])
        d["fired"]        = bool(d["fired"])
        rows.append(d)
    return rows


@router.post("", response_model=AlarmResponse)
async def create_alarm(body: AlarmCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            INSERT INTO alarms
              (race_id, race_name, race_date, race_time, minutes_before, notify_mac, notify_email)
            VALUES
              (:race_id, :race_name, :race_date, :race_time, :minutes_before, :notify_mac, :notify_email)
        """),
        {
            "race_id":        body.race_id,
            "race_name":      body.race_name,
            "race_date":      body.race_date,
            "race_time":      body.race_time,
            "minutes_before": body.minutes_before,
            "notify_mac":     int(body.notify_mac),
            "notify_email":   int(body.notify_email),
        },
    )
    await db.commit()
    new_id = result.lastrowid
    row = await db.execute(text("SELECT * FROM alarms WHERE id = :id"), {"id": new_id})
    d = dict(row.fetchone()._mapping)
    d["notify_mac"]   = bool(d["notify_mac"])
    d["notify_email"] = bool(d["notify_email"])
    d["fired"]        = bool(d["fired"])
    return d


@router.delete("/{alarm_id}")
async def delete_alarm(alarm_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("DELETE FROM alarms WHERE id = :id"), {"id": alarm_id}
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="アラームが見つかりません")
    return {"message": "削除しました"}


@router.post("/test")
async def test_notification(db: AsyncSession = Depends(get_db)):
    """通知テスト（設定確認用）"""
    from app.services.notification_service import send_race_alarm
    result = await db.execute(text("SELECT key, value FROM settings"))
    cfg = {r[0]: r[1] for r in result.fetchall()}
    send_race_alarm(
        race_name="テストレース",
        race_date="2025-04-19",
        race_time="15:30",
        minutes_before=30,
        notify_mac_flag=cfg.get("notify_mac", "true").lower() == "true",
        notify_email_flag=cfg.get("notify_email", "false").lower() == "true",
        to_email=cfg.get("notification_email", ""),
        app_password=cfg.get("gmail_app_password", ""),
    )
    return {"message": "テスト通知を送信しました"}
