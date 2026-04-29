import { AnalysisResult } from "@/types";
import ScoreBar from "@/components/Race/ScoreBar";

interface Props {
  result: AnalysisResult;
}

const CATEGORY_LABELS: Record<string, string> = {
  recent: "直近成績",
  odds: "オッズ人気",
  distance: "距離適性",
  jockey: "騎手",
  gate: "枠順",
  manual: "手動補正",
};

export default function ReasonPanel({ result }: Props) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-white font-semibold text-base">{result.horse_name}</span>
        <span className="text-slate-400 text-sm">#{result.horse_number}</span>
        <span className="ml-auto text-green-400 font-bold text-lg">
          {result.total_score.toFixed(1)} pt
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {result.reasons.map((reason, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{CATEGORY_LABELS[reason.category] ?? reason.label}</span>
              <span className="text-slate-300">{reason.description}</span>
            </div>
            <ScoreBar score={reason.score} maxScore={30} showValue={true} />
          </div>
        ))}
      </div>

      {result.warnings.length > 0 && (
        <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg">
          <p className="text-yellow-400 text-xs font-semibold mb-1">⚠ データ警告</p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-yellow-300 text-xs">{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
