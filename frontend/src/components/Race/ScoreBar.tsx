interface Props {
  score: number;
  maxScore?: number;
  label?: string;
  showValue?: boolean;
  color?: string;
}

export default function ScoreBar({
  score,
  maxScore = 100,
  label,
  showValue = true,
  color,
}: Props) {
  const pct = Math.min((score / maxScore) * 100, 100);

  let barColor = color;
  if (!barColor) {
    if (pct >= 70) barColor = "bg-green-500";
    else if (pct >= 45) barColor = "bg-yellow-500";
    else barColor = "bg-slate-500";
  }

  return (
    <div className="flex items-center gap-2 w-full">
      {label && <span className="text-slate-400 text-xs w-16 shrink-0">{label}</span>}
      <div className="flex-1 bg-slate-700 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="text-slate-300 text-xs w-10 text-right shrink-0">
          {score.toFixed(1)}
        </span>
      )}
    </div>
  );
}
