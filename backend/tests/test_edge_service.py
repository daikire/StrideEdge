"""
edge_service のユニットテスト
"""
import pytest
from typing import Optional
from app.models.schemas import AnalysisResult, PassOrPlayLabel
from app.services.edge_service import (
    compute_edge_signal,
    detect_overhyped,
    apply_bet_navigator,
    compute_today_edge,
)
from app.services.ticket_service import generate_suggestions
from app.models.schemas import PredictionMode


def _make_result(
    horse_id: str,
    horse_name: str,
    horse_number: int,
    total_score: float,
    rank: int,
    odds: Optional[float] = None,
    warnings: Optional[list] = None,
) -> AnalysisResult:
    return AnalysisResult(
        race_id="test_race",
        horse_id=horse_id,
        horse_name=horse_name,
        horse_number=horse_number,
        total_score=total_score,
        recent_score=0,
        odds_score=0,
        distance_score=0,
        jockey_score=0,
        gate_score=0,
        manual_correction=0,
        odds=odds,
        rank=rank,
        warnings=warnings or [],
    )


class TestComputeEdgeSignal:
    def test_play_signal_high_ev(self):
        results = [
            _make_result("h1", "テスト馬1", 1, 72.0, 1, odds=2.5),
            _make_result("h2", "テスト馬2", 2, 60.0, 2, odds=4.0),
            _make_result("h3", "テスト馬3", 3, 50.0, 3, odds=8.0),
        ]
        signal = compute_edge_signal(results, "test_race")
        assert signal.label == PassOrPlayLabel.play
        assert signal.ev_ratio > 0
        assert signal.ev_spread == pytest.approx(12.0)
        assert signal.race_id == "test_race"

    def test_pass_signal_low_ev(self):
        results = [
            _make_result("h1", "テスト馬1", 1, 35.0, 1, odds=3.0),
            _make_result("h2", "テスト馬2", 2, 33.0, 2, odds=5.0),
        ]
        signal = compute_edge_signal(results, "test_race")
        assert signal.label == PassOrPlayLabel.pass_signal

    def test_watch_signal_mid_ev(self):
        results = [
            _make_result("h1", "テスト馬1", 1, 55.0, 1, odds=3.0),
            _make_result("h2", "テスト馬2", 2, 53.0, 2, odds=5.0),
        ]
        signal = compute_edge_signal(results, "test_race")
        assert signal.label == PassOrPlayLabel.watch

    def test_empty_results(self):
        signal = compute_edge_signal([], "test_race")
        assert signal.label == PassOrPlayLabel.pass_signal
        assert signal.top_ev_score == 0.0

    def test_bet_type_advice_nonempty(self):
        results = [_make_result("h1", "馬1", 1, 70.0, 1, odds=2.0)]
        signal = compute_edge_signal(results, "r1")
        assert len(signal.bet_type_advice) > 0


class TestDetectOverhyped:
    def test_overhyped_detected(self):
        results = [
            # 人気1番（オッズ1.5）だがスコアは6位
            _make_result("h1", "人気馬", 1, 40.0, 6, odds=1.5),
            _make_result("h2", "実力1位", 2, 70.0, 1, odds=8.0),
            _make_result("h3", "実力2位", 3, 65.0, 2, odds=6.0),
            _make_result("h4", "馬4", 4, 55.0, 3, odds=10.0),
            _make_result("h5", "馬5", 5, 50.0, 4, odds=15.0),
            _make_result("h6", "馬6", 6, 45.0, 5, odds=20.0),
        ]
        overhyped = detect_overhyped(results)
        assert len(overhyped) >= 1
        assert overhyped[0].horse_name == "人気馬"
        assert overhyped[0].popularity_rank == 1
        assert overhyped[0].score_rank == 6

    def test_no_overhyped_when_aligned(self):
        results = [
            _make_result("h1", "馬1", 1, 75.0, 1, odds=2.0),
            _make_result("h2", "馬2", 2, 60.0, 2, odds=4.0),
            _make_result("h3", "馬3", 3, 50.0, 3, odds=8.0),
        ]
        overhyped = detect_overhyped(results)
        assert len(overhyped) == 0

    def test_no_odds_data(self):
        results = [
            _make_result("h1", "馬1", 1, 75.0, 1, odds=None),
        ]
        overhyped = detect_overhyped(results)
        assert overhyped == []


class TestApplyBetNavigator:
    def _make_simple_results(self, score: float = 72.0, spread: float = 12.0):
        r1 = _make_result("h1", "馬1", 1, score, 1, odds=2.5)
        r2 = _make_result("h2", "馬2", 2, score - spread, 2, odds=5.0)
        r3 = _make_result("h3", "馬3", 3, score - spread - 5, 3, odds=10.0)
        return [r1, r2, r3]

    def test_play_low_vol_recommends_tan_umaren(self):
        results = self._make_simple_results()
        signal = compute_edge_signal(results, "r1")
        # Force PLAY label
        from app.models.schemas import PassOrPlayLabel
        signal.label = PassOrPlayLabel.play
        signal.volatility_index = 15.0  # low vol

        entries_map = {r.horse_id: {"odds": r.odds} for r in results}
        suggestions = generate_suggestions("r1", results, PredictionMode.standard, 3000, entries_map)
        suggestions = apply_bet_navigator(suggestions, signal)

        tan = next(s for s in suggestions if s.ticket_type.value == "tan")
        umaren = next(s for s in suggestions if s.ticket_type.value == "umaren")
        assert tan.recommendation == "recommended"
        assert umaren.recommendation == "recommended"

    def test_pass_all_avoid(self):
        results = [_make_result("h1", "馬1", 1, 30.0, 1)]
        signal = compute_edge_signal(results, "r1")
        from app.models.schemas import PassOrPlayLabel
        signal.label = PassOrPlayLabel.pass_signal

        entries_map = {}
        suggestions = generate_suggestions("r1", results, PredictionMode.standard, 3000, entries_map)
        suggestions = apply_bet_navigator(suggestions, signal)

        for s in suggestions:
            assert s.recommendation == "avoid"


class TestComputeTodayEdge:
    def test_returns_totals(self):
        races = [
            {"race_id": "r1", "race_name": "テスト1R", "race_number": 1, "venue": "東京"},
            {"race_id": "r2", "race_name": "テスト2R", "race_number": 2, "venue": "東京"},
        ]
        analyses = {
            "r1": [_make_result("h1", "馬1", 1, 72.0, 1, odds=2.0)],
            "r2": [_make_result("h1", "馬1", 1, 30.0, 1, odds=3.0)],
        }
        edge = compute_today_edge(races, analyses)
        assert edge.race_count == 2
        assert edge.play_count + edge.watch_count + edge.caution_count + edge.pass_count == 2

    def test_empty_returns_no_data(self):
        edge = compute_today_edge([], {})
        assert edge.race_count == 0
        assert edge.risk_posture == "NO DATA"

    def test_all_play_is_aggressive(self):
        races = [
            {"race_id": f"r{i}", "race_name": f"R{i}", "race_number": i, "venue": "東京"}
            for i in range(1, 5)
        ]
        # Two horses per race: top 73pt, second 65pt → spread=8pt → qualifies PLAY
        analyses = {
            r["race_id"]: [
                _make_result("h1", "馬1", 1, 73.0, 1, odds=2.0),
                _make_result("h2", "馬2", 2, 65.0, 2, odds=5.0),
            ]
            for r in races
        }
        edge = compute_today_edge(races, analyses)
        assert edge.play_count == 4
        assert edge.risk_posture == "AGGRESSIVE"
