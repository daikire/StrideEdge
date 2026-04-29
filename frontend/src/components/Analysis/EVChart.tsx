"use client";
import { AnalysisResult } from "@/types";

interface Props {
  results: AnalysisResult[];
  maxDisplay?: number;
}

const MAX_SCORE = 100;

function barColor(rank: number): string {
  if (rank === 1) return "var(--gold)";
  if (rank === 2) return "var(--positive)";
  if (rank === 3) return "#60a5fa";
  return "var(--text-dim)";
}

export default function EVChart({ results, maxDisplay = 8 }: Props) {
  const top = results.slice(0, maxDisplay);
  if (top.length === 0) return null;

  const maxBar = Math.max(...top.map((r) => r.total_score), 1);

  return (
    <div>
      <p className="term-label mb-2">EV DISTRIBUTION</p>
      <div className="space-y-1.5">
        {top.map((r) => {
          const pct = (r.total_score / maxBar) * 100;
          const absRatio = Math.round((r.total_score / MAX_SCORE) * 100);
          return (
            <div key={r.horse_id} className="flex items-center gap-2">
              {/* rank + number */}
              <span
                className="w-14 shrink-0 text-right tabular-nums text-[10px]"
                style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
              >
                #{r.rank} {r.horse_number}番
              </span>
              {/* name */}
              <span
                className="w-20 shrink-0 truncate text-[11px]"
                style={{ color: r.rank <= 3 ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                {r.horse_name}
              </span>
              {/* bar */}
              <div
                className="flex-1 h-3 rounded-sm overflow-hidden"
                style={{ background: "var(--bg-base)" }}
              >
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: barColor(r.rank),
                    opacity: r.rank > 4 ? 0.5 : 1,
                  }}
                />
              </div>
              {/* score */}
              <span
                className="w-12 shrink-0 text-right tabular-nums text-[10px]"
                style={{ color: barColor(r.rank), fontFamily: "'DM Mono', monospace" }}
              >
                {r.total_score.toFixed(0)}pt
              </span>
              {/* abs ratio */}
              <span
                className="w-8 shrink-0 text-right tabular-nums text-[9px]"
                style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
              >
                {absRatio}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
