"""
券種別提案ロジック。3モード対応。
"""
from typing import List, Optional
from app.models.schemas import (
    AnalysisResult, BuyCandidate, TicketSuggestion, TicketType, PredictionMode
)


def _get_mode_config(mode: PredictionMode) -> dict:
    if mode == PredictionMode.conservative:
        return {"top_n": 2, "odds_max": 8.0, "budget_ratio": 0.6, "label": "堅め"}
    elif mode == PredictionMode.aggressive:
        return {"top_n": 5, "odds_max": 50.0, "budget_ratio": 1.0, "label": "穴狙い"}
    else:
        return {"top_n": 3, "odds_max": 20.0, "budget_ratio": 0.8, "label": "標準"}


def generate_suggestions(
    race_id: str,
    analysis_results: List[AnalysisResult],
    mode: PredictionMode,
    budget: int = 3000,
    entries_map: Optional[dict] = None,
) -> List[TicketSuggestion]:
    """分析結果から券種別買い目を生成"""
    config = _get_mode_config(mode)
    top_n = config["top_n"]
    odds_max = config["odds_max"]
    budget_ratio = config["budget_ratio"]
    effective_budget = int(budget * budget_ratio)

    entries_map = entries_map or {}

    # スコア順上位から対象馬を選択
    candidates = []
    for r in analysis_results:
        entry = entries_map.get(r.horse_id, {})
        odds = entry.get("odds", 0) or 0
        if mode == PredictionMode.aggressive:
            # 穴狙い：オッズ高めの馬を優先
            if odds >= 5.0:
                candidates.append(r)
        elif mode == PredictionMode.conservative:
            # 堅め：低オッズの馬のみ
            if odds <= odds_max:
                candidates.append(r)
        else:
            candidates.append(r)

        if len(candidates) >= top_n:
            break

    if not candidates:
        candidates = analysis_results[:top_n]

    top_numbers = [c.horse_number for c in candidates]

    suggestions = []

    # 単勝
    tan_candidates = []
    per_horse_budget = effective_budget // max(len(top_numbers[:2]), 1)
    for r in candidates[:2]:
        entry = entries_map.get(r.horse_id, {})
        odds = entry.get("odds", 1.0) or 1.0
        tan_candidates.append(BuyCandidate(
            horse_numbers=[r.horse_number],
            label=f"{r.horse_number}番 {r.horse_name}",
            expected_return=round(per_horse_budget * odds, 0),
            confidence=round(1.0 / r.rank if r.rank > 0 else 0.5, 2),
            amount=per_horse_budget,
        ))
    suggestions.append(TicketSuggestion(
        race_id=race_id, mode=mode, ticket_type=TicketType.tan,
        candidates=tan_candidates,
        total_budget=per_horse_budget * len(tan_candidates),
        summary=f"スコア上位{len(tan_candidates)}頭の単勝",
    ))

    # 馬連
    umaren_candidates = []
    if len(top_numbers) >= 2:
        pairs = []
        for i in range(len(top_numbers)):
            for j in range(i + 1, min(len(top_numbers), 3)):
                pairs.append((top_numbers[i], top_numbers[j]))
        per_pair = effective_budget // max(len(pairs), 1)
        for pair in pairs[:3]:
            umaren_candidates.append(BuyCandidate(
                horse_numbers=list(pair),
                label=f"{pair[0]}-{pair[1]}",
                confidence=0.4,
                amount=per_pair,
            ))
    suggestions.append(TicketSuggestion(
        race_id=race_id, mode=mode, ticket_type=TicketType.umaren,
        candidates=umaren_candidates,
        total_budget=sum(c.amount for c in umaren_candidates),
        summary=f"上位馬の馬連ボックス",
    ))

    # 3連複
    sanren_candidates = []
    if len(top_numbers) >= 3:
        amount_per = effective_budget // 4
        sanren_candidates.append(BuyCandidate(
            horse_numbers=top_numbers[:3],
            label=f"{'-'.join(str(n) for n in top_numbers[:3])}",
            confidence=0.3,
            amount=amount_per,
        ))
        if len(top_numbers) >= 4 and mode != PredictionMode.conservative:
            sanren_candidates.append(BuyCandidate(
                horse_numbers=top_numbers[:4],
                label=f"{top_numbers[0]}-{top_numbers[1]}-{top_numbers[2]}-{top_numbers[3]}（BOX）",
                confidence=0.25,
                amount=amount_per,
            ))
    suggestions.append(TicketSuggestion(
        race_id=race_id, mode=mode, ticket_type=TicketType.sanren_fuku,
        candidates=sanren_candidates,
        total_budget=sum(c.amount for c in sanren_candidates),
        summary=f"上位馬の3連複",
    ))

    # ワイド
    wide_candidates = []
    if len(top_numbers) >= 2:
        per_pair = effective_budget // 3
        pairs = [(top_numbers[0], top_numbers[1])]
        if len(top_numbers) >= 3:
            pairs.append((top_numbers[0], top_numbers[2]))
            pairs.append((top_numbers[1], top_numbers[2]))
        for pair in pairs:
            wide_candidates.append(BuyCandidate(
                horse_numbers=list(pair),
                label=f"{pair[0]}-{pair[1]}",
                confidence=0.55,
                amount=per_pair,
            ))
    suggestions.append(TicketSuggestion(
        race_id=race_id, mode=mode, ticket_type=TicketType.wide,
        candidates=wide_candidates,
        total_budget=sum(c.amount for c in wide_candidates),
        summary=f"上位馬のワイド",
    ))

    # 3連単
    sanren_tan_candidates = []
    if len(top_numbers) >= 3:
        amount_per = effective_budget // 6
        # 軸1頭マルチ: 1着固定で2,3着を入れ替え
        perms = [
            (top_numbers[0], top_numbers[1], top_numbers[2]),
            (top_numbers[0], top_numbers[2], top_numbers[1]),
        ]
        if len(top_numbers) >= 4 and mode == PredictionMode.aggressive:
            perms += [
                (top_numbers[0], top_numbers[1], top_numbers[3]),
                (top_numbers[0], top_numbers[3], top_numbers[1]),
            ]
        for perm in perms:
            sanren_tan_candidates.append(BuyCandidate(
                horse_numbers=list(perm),
                label=f"{perm[0]}→{perm[1]}→{perm[2]}",
                confidence=0.2,
                amount=amount_per,
            ))
    suggestions.append(TicketSuggestion(
        race_id=race_id, mode=mode, ticket_type=TicketType.sanren_tan,
        candidates=sanren_tan_candidates,
        total_budget=sum(c.amount for c in sanren_tan_candidates),
        summary=f"スコア上位軸マルチ3連単",
    ))

    return suggestions
