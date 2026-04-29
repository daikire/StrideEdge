"""
スコアリングロジック
特徴量：直近成績(30pt)、オッズ(20pt)、距離適性(15pt)、騎手(15pt)、枠順(10pt)、手動補正(10pt)
"""
from typing import List, Dict, Optional
from app.models.schemas import AnalysisResult, ReasonDetail

TOP_JOCKEYS = {
    "C.ルメール": 15.0, "武豊": 14.0, "川田将雅": 13.5,
    "横山武史": 13.0, "戸崎圭太": 12.5, "松山弘平": 12.0,
    "岩田望来": 11.5, "池添謙一": 11.0, "浜中俊": 10.5,
    "内田博幸": 10.0, "三浦皇成": 9.5, "丸山元気": 9.0,
    "横山典弘": 8.5, "岩田康誠": 8.0, "田辺裕信": 7.5,
    "北村友一": 7.0, "菅原明良": 6.5, "和田竜二": 6.0,
    "津村明秀": 5.5, "幸英明": 5.0, "石橋脩": 4.5,
    "江田照男": 4.0,
}


def _parse_recent_results(results_str: str) -> List[int]:
    """直近成績文字列をパース。例: '1着,2着,3着' -> [1, 2, 3]"""
    if not results_str:
        return []
    placements = []
    for r in results_str.split(","):
        r = r.strip().replace("着", "")
        try:
            placements.append(int(r))
        except ValueError:
            pass
    return placements


def _calc_recent_score(recent_results: str, max_score: float = 30.0) -> tuple[float, List[ReasonDetail], List[str]]:
    """直近成績スコア算出"""
    warnings = []
    placements = _parse_recent_results(recent_results)

    if not placements:
        warnings.append("直近成績データなし（0点）")
        return 0.0, [ReasonDetail(
            category="recent", label="直近成績", score=0.0,
            description="データなし"
        )], warnings

    # 新しい順に重み付け
    weights = [1.0, 0.8, 0.6, 0.4, 0.2]
    score = 0.0
    total_weight = 0.0
    for i, place in enumerate(placements[:5]):
        w = weights[i]
        if place == 1:
            score += 10.0 * w
        elif place == 2:
            score += 8.0 * w
        elif place == 3:
            score += 6.0 * w
        elif place <= 5:
            score += 3.0 * w
        else:
            score += 0.0
        total_weight += w

    raw = (score / (10.0 * total_weight)) * max_score
    capped = min(raw, max_score)

    top3_count = sum(1 for p in placements[:5] if p <= 3)
    desc = f"直近{len(placements[:5])}戦 3着内{top3_count}回"
    return capped, [ReasonDetail(
        category="recent", label="直近成績", score=round(capped, 1),
        description=desc
    )], warnings


def _calc_odds_score(odds: Optional[float], max_score: float = 20.0) -> tuple[float, List[ReasonDetail], List[str]]:
    """オッズスコア算出（人気馬に高スコア）"""
    warnings = []
    if odds is None:
        warnings.append("オッズデータなし（0点）")
        return 0.0, [ReasonDetail(
            category="odds", label="オッズ", score=0.0,
            description="データなし"
        )], warnings

    # オッズ低い（人気）ほど高スコア
    if odds <= 2.0:
        score = max_score
    elif odds <= 5.0:
        score = max_score * 0.8
    elif odds <= 10.0:
        score = max_score * 0.6
    elif odds <= 20.0:
        score = max_score * 0.4
    elif odds <= 50.0:
        score = max_score * 0.2
    else:
        score = max_score * 0.1

    return score, [ReasonDetail(
        category="odds", label="オッズ", score=round(score, 1),
        description=f"オッズ {odds:.1f}倍"
    )], warnings


def _calc_distance_score(distance: int, surface: str, max_score: float = 15.0) -> tuple[float, List[ReasonDetail], List[str]]:
    """距離適性スコア（ダミーロジック）"""
    # 実際はDBの過去成績から算出。ここでは距離カテゴリで近似
    if distance <= 1400:
        label = "短距離"
    elif distance <= 2000:
        label = "マイル〜中距離"
    elif distance <= 2400:
        label = "中長距離"
    else:
        label = "長距離"

    # ダミー：芝は中距離が最も多くサンプルデータが整っているとして0.7〜1.0
    score = max_score * 0.7  # デフォルト70%

    return score, [ReasonDetail(
        category="distance", label="距離適性", score=round(score, 1),
        description=f"{label}（{distance}m/{surface}）"
    )], []


def _calc_jockey_score(jockey: Optional[str], max_score: float = 15.0) -> tuple[float, List[ReasonDetail], List[str]]:
    """騎手スコア"""
    warnings = []
    if not jockey:
        warnings.append("騎手データなし（0点）")
        return 0.0, [ReasonDetail(
            category="jockey", label="騎手", score=0.0,
            description="データなし"
        )], warnings

    raw = TOP_JOCKEYS.get(jockey, 3.0)
    score = (raw / 15.0) * max_score

    return score, [ReasonDetail(
        category="jockey", label="騎手", score=round(score, 1),
        description=f"{jockey}"
    )], warnings


def _calc_gate_score(gate_number: Optional[int], distance: int, max_score: float = 10.0) -> tuple[float, List[ReasonDetail], List[str]]:
    """枠順スコア"""
    warnings = []
    if gate_number is None:
        warnings.append("枠番データなし（0点）")
        return 0.0, [ReasonDetail(
            category="gate", label="枠順", score=0.0,
            description="データなし"
        )], warnings

    # 距離によって有利な枠が変わる（簡略化）
    if distance >= 2000:
        # 長距離：内枠有利
        if gate_number <= 2:
            score = max_score
        elif gate_number <= 4:
            score = max_score * 0.8
        elif gate_number <= 6:
            score = max_score * 0.6
        else:
            score = max_score * 0.4
    else:
        # 短距離：外枠やや有利
        if gate_number <= 2:
            score = max_score * 0.7
        elif gate_number <= 4:
            score = max_score * 0.85
        elif gate_number <= 6:
            score = max_score
        else:
            score = max_score * 0.75

    return score, [ReasonDetail(
        category="gate", label="枠順", score=round(score, 1),
        description=f"{gate_number}枠"
    )], warnings


def calculate_scores(
    entries: List[Dict],
    race_info: Dict,
    manual_corrections: Optional[Dict[str, float]] = None,
) -> List[AnalysisResult]:
    """全出走馬のスコアを算出してランク付け"""
    results = []
    corrections = manual_corrections or {}
    distance = race_info.get("distance", 2000)
    surface = race_info.get("surface", "turf")

    for entry in entries:
        horse_id = entry.get("horse_id", "")
        horse_name = entry.get("horse_name", "不明")
        horse_number = entry.get("horse_number", 0)
        recent_results = entry.get("recent_results", "")
        odds = entry.get("odds")
        jockey = entry.get("jockey")
        gate_number = entry.get("gate_number")

        all_reasons = []
        all_warnings = []

        r_score, r_reasons, r_warns = _calc_recent_score(recent_results)
        all_reasons.extend(r_reasons)
        all_warnings.extend(r_warns)

        o_score, o_reasons, o_warns = _calc_odds_score(odds)
        all_reasons.extend(o_reasons)
        all_warnings.extend(o_warns)

        d_score, d_reasons, d_warns = _calc_distance_score(distance, surface)
        all_reasons.extend(d_reasons)
        all_warnings.extend(d_warns)

        j_score, j_reasons, j_warns = _calc_jockey_score(jockey)
        all_reasons.extend(j_reasons)
        all_warnings.extend(j_warns)

        g_score, g_reasons, g_warns = _calc_gate_score(gate_number, distance)
        all_reasons.extend(g_reasons)
        all_warnings.extend(g_warns)

        manual = corrections.get(horse_id, 0.0)
        if manual != 0.0:
            all_reasons.append(ReasonDetail(
                category="manual", label="手動補正", score=manual,
                description=f"手動補正: {'+' if manual > 0 else ''}{manual:.1f}点"
            ))

        total = r_score + o_score + d_score + j_score + g_score + manual

        results.append(AnalysisResult(
            race_id=race_info.get("race_id", ""),
            horse_id=horse_id,
            horse_name=horse_name,
            horse_number=horse_number,
            total_score=round(total, 1),
            recent_score=round(r_score, 1),
            odds_score=round(o_score, 1),
            distance_score=round(d_score, 1),
            jockey_score=round(j_score, 1),
            gate_score=round(g_score, 1),
            manual_correction=round(manual, 1),
            odds=odds,
            jockey=jockey,
            reasons=all_reasons,
            warnings=all_warnings,
            rank=0,
        ))

    # スコア順にランク付け
    results.sort(key=lambda x: x.total_score, reverse=True)
    for i, r in enumerate(results):
        r.rank = i + 1

    return results
