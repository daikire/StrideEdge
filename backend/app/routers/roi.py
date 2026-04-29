"""回収率・的中率分析 API"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database.db import get_db
from app.services import db_service

router = APIRouter(prefix="/api/roi", tags=["roi"])


def _check_hit(ticket_type: str, buy_candidates: list, first: str, second: str, third: str) -> bool:
    """買い目が的中しているか簡易判定（馬番号の文字列一致）"""
    if not first:
        return False
    first_n = first.strip()
    second_n = (second or "").strip()
    third_n = (third or "").strip()
    for cand in buy_candidates:
        nums = [str(n) for n in cand.get("horse_numbers", [])]
        if ticket_type == "tan":
            if nums and nums[0] == first_n:
                return True
        elif ticket_type in ("fuku", "wide"):
            if nums and nums[0] in (first_n, second_n, third_n):
                return True
        elif ticket_type in ("umaren", "umatan"):
            if len(nums) >= 2 and set(nums[:2]) == {first_n, second_n}:
                return True
        elif ticket_type in ("sanren_fuku", "sanren_tan"):
            if len(nums) >= 3 and set(nums[:3]) == {first_n, second_n, third_n}:
                return True
    return False


@router.get("")
async def get_roi(db: AsyncSession = Depends(get_db)):
    rows = await db_service.get_roi_data(db)

    total_budget = 0
    hit_count = 0
    result_count = 0
    by_ticket: dict = {}
    by_date: dict = {}

    records = []
    for r in rows:
        total_budget += r.get("total_budget", 0)

        has_result = r.get("first_place") is not None
        hit = False
        if has_result:
            result_count += 1
            hit = _check_hit(
                r.get("ticket_type") or "",
                r.get("buy_candidates", []),
                r.get("first_place") or "",
                r.get("second_place") or "",
                r.get("third_place") or "",
            )
            if hit:
                hit_count += 1

        tt = r.get("ticket_type") or "不明"
        if tt not in by_ticket:
            by_ticket[tt] = {"count": 0, "budget": 0, "hits": 0}
        by_ticket[tt]["count"] += 1
        by_ticket[tt]["budget"] += r.get("total_budget", 0)
        if hit:
            by_ticket[tt]["hits"] += 1

        date_key = (r.get("race_date") or "")[:7]  # YYYY-MM
        if date_key:
            by_date[date_key] = by_date.get(date_key, 0) + r.get("total_budget", 0)

        records.append({
            "id": r["id"],
            "race_id": r["race_id"],
            "race_name": r.get("race_name") or r["race_id"],
            "race_date": r.get("race_date") or "",
            "venue": r.get("venue") or "",
            "ticket_type": tt,
            "mode": r.get("mode") or "",
            "total_budget": r.get("total_budget", 0),
            "has_result": has_result,
            "hit": hit,
            "first_place": r.get("first_place"),
        })

    hit_rate = round(hit_count / result_count * 100) if result_count > 0 else None

    return {
        "summary": {
            "total_budget": total_budget,
            "prediction_count": len(rows),
            "result_count": result_count,
            "hit_count": hit_count,
            "hit_rate": hit_rate,
        },
        "by_ticket": by_ticket,
        "by_date": sorted(by_date.items()),
        "records": records,
    }
