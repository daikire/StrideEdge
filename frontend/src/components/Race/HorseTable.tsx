"use client";
import { AnalysisResult } from "@/types";
import ScoreBar from "./ScoreBar";

interface Props {
  results: AnalysisResult[];
  onSelectHorse?: (horse: AnalysisResult) => void;
  selectedHorseId?: string;
}

const RANK_COLORS = ["text-yellow-400", "text-slate-300", "text-amber-600", "text-slate-400"];

export default function HorseTable({ results, onSelectHorse, selectedHorseId }: Props) {
  const maxScore = Math.max(...results.map((r) => r.total_score), 1);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800 text-slate-400 text-xs">
            <th className="px-3 py-3 text-left w-8">順</th>
            <th className="px-3 py-3 text-left w-8">番</th>
            <th className="px-3 py-3 text-left">馬名</th>
            <th className="px-3 py-3 text-left hidden md:table-cell">騎手</th>
            <th className="px-3 py-3 text-right w-16">オッズ</th>
            <th className="px-3 py-3 text-left w-36">スコア</th>
            <th className="px-3 py-3 text-right w-14">合計</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const rankColor = RANK_COLORS[Math.min(r.rank - 1, 3)] ?? "text-slate-500";
            const isSelected = selectedHorseId === r.horse_id;
            return (
              <tr
                key={r.horse_id}
                onClick={() => onSelectHorse?.(r)}
                className={`border-t border-slate-700 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-green-900/30 border-l-2 border-l-green-500"
                    : "hover:bg-slate-800"
                }`}
              >
                <td className={`px-3 py-3 font-bold ${rankColor}`}>{r.rank}</td>
                <td className="px-3 py-3 text-slate-300 font-mono">{r.horse_number}</td>
                <td className="px-3 py-3">
                  <span className="text-white font-medium">{r.horse_name}</span>
                  {r.warnings.length > 0 && (
                    <span className="ml-2 text-yellow-500 text-xs">⚠</span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-400 hidden md:table-cell">
                  {/* jockey not in AnalysisResult directly — shown via reasons */}
                  {r.reasons.find((re) => re.category === "jockey")?.description ?? "-"}
                </td>
                <td className="px-3 py-3 text-right text-slate-300">
                  {r.odds_score > 0
                    ? `${(r.odds_score > 16 ? "1.x" : r.rank <= 2 ? "〜5" : "5〜")} 倍`
                    : "-"}
                </td>
                <td className="px-3 py-3">
                  <ScoreBar score={r.total_score} maxScore={maxScore} showValue={false} />
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="text-white font-semibold">{r.total_score.toFixed(1)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
