"""
Edge signal computation: Pass or Play, Overhyped Detector, Bet Type Navigator.
"""
import math
from typing import List, Tuple, Dict
from app.models.schemas import (
    AnalysisResult, EdgeSignal, OverhypedHorse, PassOrPlayLabel,
    TodayEdge, TodayEdgeRace, TicketSuggestion,
)

_MAX_SCORE = 100.0


def _compute_pass_or_play(
    results: List[AnalysisResult],
) -> Tuple[PassOrPlayLabel, str, float, float, float]:
    """Returns (label, reason, ev_ratio, volatility_index, ev_spread)"""
    if not results:
        return PassOrPlayLabel.pass_signal, "データなし", 0.0, 0.0, 0.0

    top_score = results[0].total_score
    ev_ratio = round(top_score / _MAX_SCORE * 100, 1)
    ev_spread = round(results[0].total_score - results[1].total_score, 1) if len(results) >= 2 else 0.0

    scores = [r.total_score for r in results if r.total_score > 0]
    if len(scores) >= 2:
        mean = sum(scores) / len(scores)
        std = math.sqrt(sum((s - mean) ** 2 for s in scores) / len(scores))
        volatility = round((std / mean * 100) if mean > 0 else 0.0, 1)
    else:
        volatility = 0.0

    warning_ratio = sum(1 for r in results if r.warnings) / len(results)

    if ev_ratio >= 65 and ev_spread >= 5.0 and warning_ratio <= 0.5:
        label = PassOrPlayLabel.play
        reason = f"最高EV {top_score:.0f}pt（差{ev_spread:.1f}pt）— 明確なエッジ。積極的に参戦"
    elif ev_ratio >= 52 or (ev_ratio >= 47 and ev_spread >= 3.0):
        label = PassOrPlayLabel.watch
        reason = f"最高EV {top_score:.0f}pt — オッズ確定後に最終判断を推奨"
    elif ev_ratio >= 42:
        label = PassOrPlayLabel.caution
        reason = f"上位接戦（差{ev_spread:.1f}pt）— 少額か見送りを検討"
    else:
        label = PassOrPlayLabel.pass_signal
        reason = f"最高EV {top_score:.0f}pt — 期待値不足。資金温存を推奨"

    return label, reason, ev_ratio, volatility, ev_spread


def detect_overhyped(results: List[AnalysisResult]) -> List[OverhypedHorse]:
    if not results:
        return []
    has_odds = [r for r in results if r.odds is not None]
    sorted_by_odds = sorted(has_odds, key=lambda r: r.odds)  # type: ignore[arg-type]
    seen_pop_ranks: set = set()
    overhyped: List[OverhypedHorse] = []
    for popularity_rank, r in enumerate(sorted_by_odds, start=1):
        if popularity_rank in seen_pop_ranks:
            continue
        flagged = False
        if popularity_rank <= 3 and r.rank > 5:
            flagged = True
        elif r.odds is not None and r.odds <= 2.5 and r.rank > 6:
            flagged = True
        if flagged:
            seen_pop_ranks.add(popularity_rank)
            overhyped.append(OverhypedHorse(
                horse_id=r.horse_id,
                horse_name=r.horse_name,
                horse_number=r.horse_number,
                odds=r.odds,
                popularity_rank=popularity_rank,
                score_rank=r.rank,
                ev_score=r.total_score,
                reason=(
                    f"{popularity_rank}番人気（{r.odds:.1f}倍）に対しEVスコア{r.rank}位"
                    f"（{r.total_score:.0f}pt）— 期待値に対し過剰に買われている可能性"
                ),
            ))
    return overhyped


def compute_edge_signal(
    analysis_results: List[AnalysisResult],
    race_id: str,
) -> EdgeSignal:
    label, reason, ev_ratio, volatility, ev_spread = _compute_pass_or_play(analysis_results)
    overhyped = detect_overhyped(analysis_results)
    top_score = analysis_results[0].total_score if analysis_results else 0.0

    if label == PassOrPlayLabel.play and volatility < 30:
        bet_advice = "単勝・馬連推奨（明確な本命あり、リスク低）"
    elif label == PassOrPlayLabel.play and volatility >= 30:
        bet_advice = "ワイド・3連複推奨（本命はあるが波乱含み）"
    elif label == PassOrPlayLabel.watch:
        bet_advice = "ワイド・3連複で中リスク（オッズ確定後に再評価）"
    elif label == PassOrPlayLabel.caution:
        bet_advice = "少額ワイドのみ（リスクを限定）"
    else:
        bet_advice = "投資不推奨（見送りが賢明）"

    return EdgeSignal(
        race_id=race_id,
        label=label,
        label_reason=reason,
        ev_ratio=ev_ratio,
        volatility_index=volatility,
        top_ev_score=top_score,
        ev_spread=ev_spread,
        overhyped=overhyped,
        bet_type_advice=bet_advice,
    )


def apply_bet_navigator(
    suggestions: List[TicketSuggestion],
    edge: EdgeSignal,
) -> List[TicketSuggestion]:
    label_val = edge.label.value
    volatility = edge.volatility_index

    for s in suggestions:
        t = s.ticket_type.value
        if label_val == "PASS":
            s.recommendation = "avoid"
            s.navigator_reason = "Passシグナルのため全券種非推奨"
        elif label_val == "PLAY":
            if volatility < 30:
                if t in ("tan", "umaren"):
                    s.recommendation = "recommended"
                    s.navigator_reason = "明確な本命あり。単勝・馬連で効率的な資金投下"
                elif t == "sanren_tan":
                    s.recommendation = "avoid"
                    s.navigator_reason = "低ボラティリティレース。3連単は割に合わない"
                else:
                    s.recommendation = "neutral"
                    s.navigator_reason = ""
            else:
                if t in ("wide", "sanren_fuku"):
                    s.recommendation = "recommended"
                    s.navigator_reason = "本命あり・波乱含み。ワイド・3連複でリスクヘッジ"
                else:
                    s.recommendation = "neutral"
                    s.navigator_reason = ""
        elif label_val == "WATCH":
            if t in ("wide", "sanren_fuku"):
                s.recommendation = "recommended"
                s.navigator_reason = "Watchレース。ワイド・3連複で分散"
            elif t == "sanren_tan":
                s.recommendation = "avoid"
                s.navigator_reason = "不確定要素あり。3連単は非推奨"
            else:
                s.recommendation = "neutral"
                s.navigator_reason = ""
        else:  # CAUTION
            if t == "wide":
                s.recommendation = "neutral"
                s.navigator_reason = "少額ワイドに限定推奨"
            else:
                s.recommendation = "avoid"
                s.navigator_reason = "上位接戦。高額賭けは非推奨"
    return suggestions


def compute_today_edge(
    races: List[Dict],
    analyses: Dict[str, List[AnalysisResult]],
) -> TodayEdge:
    from datetime import date as dt
    today = dt.today().isoformat()

    race_edges: List[TodayEdgeRace] = []
    for race in races:
        race_id = race.get("race_id", "")
        results = analyses.get(race_id, [])
        label, reason, ev_ratio, _, _ = _compute_pass_or_play(results)
        top_score = results[0].total_score if results else 0.0
        race_edges.append(TodayEdgeRace(
            race_id=race_id,
            race_name=race.get("race_name", ""),
            race_number=race.get("race_number", 0),
            venue=race.get("venue", ""),
            label=label,
            label_reason=reason,
            ev_ratio=ev_ratio,
            top_ev_score=top_score,
        ))

    play_count = sum(1 for e in race_edges if e.label == PassOrPlayLabel.play)
    watch_count = sum(1 for e in race_edges if e.label == PassOrPlayLabel.watch)
    caution_count = sum(1 for e in race_edges if e.label == PassOrPlayLabel.caution)
    pass_count = sum(1 for e in race_edges if e.label == PassOrPlayLabel.pass_signal)
    total = len(race_edges)

    if total == 0:
        risk_posture = "NO DATA"
        risk_reason = "対象日のレースデータがありません"
    else:
        play_ratio = play_count / total
        if play_ratio >= 0.5:
            risk_posture = "AGGRESSIVE"
            risk_reason = f"全{total}レース中{play_count}レースがPlay — 積極的な参戦日"
        elif play_ratio >= 0.25 or (play_count + watch_count) / total >= 0.5:
            risk_posture = "STANDARD"
            risk_reason = f"Play/Watch合計{play_count + watch_count}レース — 選択的に参戦"
        else:
            risk_posture = "CONSERVATIVE"
            risk_reason = f"有望レース少数（Play{play_count}件）— 少額で慎重に"

    top_plays = sorted(
        [e for e in race_edges if e.label == PassOrPlayLabel.play],
        key=lambda x: x.top_ev_score,
        reverse=True,
    )
    return TodayEdge(
        date=today,
        race_count=total,
        play_count=play_count,
        watch_count=watch_count,
        caution_count=caution_count,
        pass_count=pass_count,
        risk_posture=risk_posture,
        risk_reason=risk_reason,
        top_plays=top_plays,
        all_races=race_edges,
    )
