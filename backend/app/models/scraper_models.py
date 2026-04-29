import re
from typing import Optional
from pydantic import BaseModel, field_validator


class ScrapedRace(BaseModel):
    race_id: str
    race_name: str
    race_date: str  # YYYY-MM-DD
    venue: str
    race_number: int
    distance: int
    surface: str  # 芝 / ダート
    grade: Optional[str] = None
    race_class: Optional[str] = None


class ScrapedEntry(BaseModel):
    race_id: str
    horse_id: str
    horse_name: str
    horse_number: int
    gate_number: Optional[int] = None
    jockey: Optional[str] = None
    weight_carried: Optional[float] = None
    odds: Optional[float] = None
    popularity: Optional[int] = None
    recent_results: Optional[str] = None
    horse_weight: Optional[int] = None
    horse_weight_diff: Optional[int] = None

    @field_validator("weight_carried", mode="before")
    @classmethod
    def parse_weight_carried(cls, v) -> Optional[float]:
        if v is None or str(v).strip() in ("", "---"):
            return None
        try:
            return float(str(v).strip())
        except (ValueError, TypeError):
            return None

    @field_validator("odds", mode="before")
    @classmethod
    def parse_odds(cls, v) -> Optional[float]:
        if v is None or str(v).strip() in ("", "---"):
            return None
        try:
            return float(str(v).replace(",", "").strip())
        except (ValueError, TypeError):
            return None

    @field_validator("popularity", mode="before")
    @classmethod
    def parse_popularity(cls, v) -> Optional[int]:
        if v is None or str(v).strip() in ("", "---"):
            return None
        try:
            return int(str(v).strip())
        except (ValueError, TypeError):
            return None

    @field_validator("horse_weight", mode="before")
    @classmethod
    def parse_horse_weight(cls, v) -> Optional[int]:
        """'480(+4)' → 480"""
        if v is None or str(v).strip() in ("", "---"):
            return None
        m = re.match(r"^(\d+)", str(v).strip())
        return int(m.group(1)) if m else None

    @field_validator("horse_weight_diff", mode="before")
    @classmethod
    def parse_horse_weight_diff(cls, v) -> Optional[int]:
        """'480(+4)' → 4  /  '480(-2)' → -2"""
        if v is None or str(v).strip() in ("", "---"):
            return None
        m = re.search(r"\(([+-]?\d+)\)", str(v))
        return int(m.group(1)) if m else None
