from pydantic import BaseModel, Field
from typing import Optional, List, Any
from enum import Enum
from datetime import date


class PredictionMode(str, Enum):
    conservative = "conservative"  # 堅め
    standard = "standard"          # 標準
    aggressive = "aggressive"      # 穴狙い


class TicketType(str, Enum):
    tan = "tan"           # 単勝
    fuku = "fuku"         # 複勝
    wakuren = "wakuren"   # 枠連
    umaren = "umaren"     # 馬連
    wide = "wide"         # ワイド
    umatan = "umatan"     # 馬単
    sanren_fuku = "sanren_fuku"  # 3連複
    sanren_tan = "sanren_tan"    # 3連単


class RaceInfo(BaseModel):
    race_id: str
    race_name: str
    race_date: str
    venue: str
    race_number: int
    distance: int
    surface: str
    grade: Optional[str] = None
    race_class: Optional[str] = None
    prize_money: int = 0
    status: str = "scheduled"
    is_win5: bool = False

    class Config:
        from_attributes = True


class HorseInfo(BaseModel):
    horse_id: str
    horse_name: str
    age: Optional[int] = None
    sex: Optional[str] = None
    trainer: Optional[str] = None
    owner: Optional[str] = None

    class Config:
        from_attributes = True


class EntryInfo(BaseModel):
    entry_id: str
    race_id: str
    horse_id: str
    horse_number: int
    gate_number: Optional[int] = None
    jockey: Optional[str] = None
    weight_carried: float = 55.0
    odds: Optional[float] = None
    popularity: Optional[int] = None
    recent_results: str = ""
    horse_weight: Optional[int] = None
    horse_weight_diff: int = 0
    horse_name: Optional[str] = None
    trainer: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None

    class Config:
        from_attributes = True


class ReasonDetail(BaseModel):
    category: str
    label: str
    score: float
    description: str


class AnalysisResult(BaseModel):
    race_id: str
    horse_id: str
    horse_name: str
    horse_number: int
    total_score: float = 0.0
    recent_score: float = 0.0
    odds_score: float = 0.0
    distance_score: float = 0.0
    jockey_score: float = 0.0
    gate_score: float = 0.0
    manual_correction: float = 0.0
    odds: Optional[float] = None
    jockey: Optional[str] = None
    reasons: List[ReasonDetail] = []
    warnings: List[str] = []
    rank: int = 0

    class Config:
        from_attributes = True


class BuyCandidate(BaseModel):
    horse_numbers: List[int]
    label: str
    expected_return: Optional[float] = None
    confidence: float = 0.5
    amount: int = 100


class TicketSuggestion(BaseModel):
    race_id: str
    mode: PredictionMode
    ticket_type: TicketType
    candidates: List[BuyCandidate] = []
    total_budget: int = 0
    summary: str = ""
    recommendation: str = "neutral"
    navigator_reason: str = ""


class ManualCorrectionInput(BaseModel):
    horse_id: str
    correction_value: float = Field(ge=-10.0, le=10.0)
    reason: Optional[str] = None


class DataStatus(BaseModel):
    source_name: str
    status: str  # ok / warning / error
    last_updated: Optional[str] = None
    record_count: int = 0
    message: str = ""


class RaceResultInput(BaseModel):
    race_id: str
    first_place: str
    second_place: str
    third_place: str
    fourth_place: Optional[str] = None
    result_detail: Optional[dict] = None


class RaceResultResponse(BaseModel):
    id: int
    race_id: str
    first_place: str
    second_place: str
    third_place: str
    fourth_place: Optional[str] = None
    registered_at: str

    class Config:
        from_attributes = True


class PredictionInput(BaseModel):
    race_id: str
    mode: PredictionMode = PredictionMode.standard
    ticket_type: Optional[TicketType] = None
    buy_candidates: List[Any] = []
    total_budget: int = 0
    memo: str = ""


class PredictionResponse(BaseModel):
    id: int
    race_id: str
    race_name: Optional[str] = None
    mode: str
    ticket_type: Optional[str] = None
    buy_candidates: List[Any] = []
    total_budget: int = 0
    memo: str = ""
    created_at: str

    class Config:
        from_attributes = True


class SettingsModel(BaseModel):
    weight_recent_results: int = 30
    weight_odds: int = 20
    weight_distance: int = 15
    weight_jockey: int = 15
    weight_gate: int = 10
    weight_manual: int = 10
    default_mode: str = "standard"
    target_min_odds: float = 2.0
    target_max_odds: float = 50.0
    budget_per_race: int = 3000
    enable_notifications: bool = True
    dark_mode: bool = True


class PassOrPlayLabel(str, Enum):
    play = "PLAY"
    watch = "WATCH"
    caution = "CAUTION"
    pass_signal = "PASS"


class OverhypedHorse(BaseModel):
    horse_id: str
    horse_name: str
    horse_number: int
    odds: float
    popularity_rank: int
    score_rank: int
    ev_score: float
    reason: str


class EdgeSignal(BaseModel):
    race_id: str
    label: PassOrPlayLabel
    label_reason: str
    ev_ratio: float
    volatility_index: float
    top_ev_score: float
    ev_spread: float
    overhyped: List[OverhypedHorse] = []
    bet_type_advice: str = ""


class TodayEdgeRace(BaseModel):
    race_id: str
    race_name: str
    race_number: int
    venue: str
    label: PassOrPlayLabel
    label_reason: str
    ev_ratio: float
    top_ev_score: float


class TodayEdge(BaseModel):
    date: str
    race_count: int
    play_count: int
    watch_count: int
    caution_count: int
    pass_count: int
    risk_posture: str
    risk_reason: str
    top_plays: List[TodayEdgeRace] = []
    all_races: List[TodayEdgeRace] = []
