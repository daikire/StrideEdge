"""APScheduler — 1分ごとにアラームを確認して通知を発火"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from sqlalchemy import text
from app.database.db import AsyncSessionLocal
from app.services.notification_service import send_race_alarm

scheduler = AsyncIOScheduler(timezone="Asia/Tokyo")


async def _check_alarms():
    now = datetime.now()
    async with AsyncSessionLocal() as db:
        # 設定を取得
        result = await db.execute(text("SELECT key, value FROM settings"))
        cfg = {r[0]: r[1] for r in result.fetchall()}

        notify_mac_flag  = cfg.get("notify_mac", "true").lower() == "true"
        notify_email_flag = cfg.get("notify_email", "false").lower() == "true"
        to_email         = cfg.get("notification_email", "")
        app_password     = cfg.get("gmail_app_password", "")

        # 未発火のアラームを全件取得
        result = await db.execute(
            text("SELECT * FROM alarms WHERE fired = 0")
        )
        alarms = [dict(r._mapping) for r in result.fetchall()]

    for alarm in alarms:
        try:
            fire_dt = datetime.strptime(
                f"{alarm['race_date']} {alarm['race_time']}", "%Y-%m-%d %H:%M"
            ) - timedelta(minutes=alarm["minutes_before"])
        except ValueError:
            continue

        if now >= fire_dt:
            send_race_alarm(
                race_name=alarm["race_name"],
                race_date=alarm["race_date"],
                race_time=alarm["race_time"],
                minutes_before=alarm["minutes_before"],
                notify_mac_flag=notify_mac_flag,
                notify_email_flag=notify_email_flag,
                to_email=to_email,
                app_password=app_password,
            )
            async with AsyncSessionLocal() as db:
                await db.execute(
                    text("UPDATE alarms SET fired = 1 WHERE id = :id"),
                    {"id": alarm["id"]},
                )
                await db.commit()
            print(f"[スケジューラ] アラーム発火: {alarm['race_name']} ({alarm['race_date']})")


def start_scheduler():
    scheduler.add_job(_check_alarms, "interval", minutes=1, id="alarm_check", replace_existing=True)
    scheduler.start()
    print("[スケジューラ] 起動完了（1分間隔でアラーム確認）")


def stop_scheduler():
    scheduler.shutdown(wait=False)
