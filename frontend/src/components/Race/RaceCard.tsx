import Link from "next/link";
import { RaceInfo, SURFACE_LABELS } from "@/types";

interface Props {
  race: RaceInfo;
}

const GRADE_COLORS: Record<string, string> = {
  G1: "bg-yellow-500 text-black",
  G2: "bg-slate-400 text-black",
  G3: "bg-amber-700 text-white",
};

export default function RaceCard({ race }: Props) {
  const gradeColor = race.grade ? GRADE_COLORS[race.grade] || "bg-blue-600 text-white" : "";
  const surfaceLabel = SURFACE_LABELS[race.surface as keyof typeof SURFACE_LABELS] ?? race.surface;
  const surfaceColor = race.surface === "turf" ? "text-green-400" : "text-amber-400";

  return (
    <Link href={`/races/${race.race_id}`}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-green-600 hover:bg-slate-750 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-mono">R{race.race_number}</span>
            {race.is_win5 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-700 text-white tracking-wide">
                WIN5
              </span>
            )}
            {race.grade && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor}`}>
                {race.grade}
              </span>
            )}
          </div>
          <span className={`text-xs font-medium ${surfaceColor}`}>
            {surfaceLabel} {race.distance}m
          </span>
        </div>

        <p className="text-white font-semibold text-base group-hover:text-green-400 transition-colors mb-1">
          {race.race_name}
        </p>

        <div className="flex items-center justify-between mt-2">
          <span className="text-slate-400 text-sm">{race.venue}</span>
          {race.race_class && (
            <span className="text-slate-500 text-xs">{race.race_class}</span>
          )}
        </div>

        {race.prize_money > 0 && (
          <p className="text-slate-500 text-xs mt-1">
            賞金 {(race.prize_money / 10000).toFixed(0)}万円
          </p>
        )}
      </div>
    </Link>
  );
}
