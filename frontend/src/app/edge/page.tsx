"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTodayEdge, fetchRaceDates } from "@/lib/api";
import { TodayEdge, TodayEdgeRace, PassOrPlayLabel } from "@/types";
import EdgeBadge from "@/components/Analysis/EdgeBadge";

const panel = { background: "var(--bg-panel)", border: "1px solid var(--border)" } as const;

const POSTURE_COLOR: Record<string, string> = {
  AGGRESSIVE:  "var(--positive)",
  STANDARD:    "var(--gold)",
  CONSERVATIVE:"var(--warn)",
  "NO DATA":   "var(--text-dim)",
};

function RaceRow({ race }: { race: TodayEdgeRace }) {
  return (
    <Link href={`/races/${race.race_id}`}>
      <div
        className="flex items-center gap-3 px-3 py-2.5 transition-all"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      >
        <span
          className="w-10 shrink-0 text-right tabular-nums text-[10px]"
          style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
        >
          R{race.race_number}
        </span>
        <EdgeBadge label={race.label} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
            {race.race_name}
          </p>
          <p
            className="text-[10px] mt-0.5 leading-snug"
            style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
          >
            {race.venue} — {race.label_reason.slice(0, 40)}{race.label_reason.length > 40 ? "…" : ""}
          </p>
        </div>
        <span
          className="tabular-nums text-[10px] shrink-0"
          style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
        >
          EV {race.ev_ratio.toFixed(0)}%
        </span>
      </div>
    </Link>
  );
}

export default function TodayEdgePage() {
  const [edge, setEdge] = useState<TodayEdge | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<PassOrPlayLabel | "ALL">("ALL");

  useEffect(() => {
    fetchRaceDates()
      .then((d) => {
        setDates(d);
        if (d.length > 0) setSelectedDate(d[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    fetchTodayEdge(selectedDate)
      .then(setEdge)
      .catch(() => setError("データ取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const filteredRaces = edge?.all_races.filter(
    (r) => filterLabel === "ALL" || r.label === filterLabel
  ) ?? [];

  const postureColor = POSTURE_COLOR[edge?.risk_posture ?? "NO DATA"] ?? "var(--text-dim)";

  return (
    <div className="space-y-4 max-w-4xl mx-auto">

      {/* page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="term-label">TODAY&apos;S EDGE</p>
          <h2
            className="text-lg font-semibold mt-0.5"
            style={{ color: "var(--text-primary)", fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Morning Brief
          </h2>
        </div>
        {dates.length > 0 && (
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "2px",
            }}
          >
            {dates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="h-20 rounded animate-pulse" style={{ background: "var(--bg-panel)" }} />
          <div className="h-48 rounded animate-pulse" style={{ background: "var(--bg-panel)" }} />
        </div>
      )}

      {error && (
        <div
          className="rounded px-4 py-2 text-xs"
          style={{ background: "#1a0505", border: "1px solid var(--negative)", color: "var(--negative)", fontFamily: "'DM Mono', monospace" }}
        >
          {error}
        </div>
      )}

      {!loading && edge && (
        <>
          {/* risk posture banner */}
          <div
            className="rounded p-4 flex items-center justify-between gap-4"
            style={{ background: "var(--bg-elevated)", border: `1px solid var(--border-bright)` }}
          >
            <div>
              <p className="term-label mb-1">RECOMMENDED RISK POSTURE</p>
              <p
                className="text-2xl font-semibold tracking-widest"
                style={{ color: postureColor, fontFamily: "'DM Mono', monospace" }}
              >
                {edge.risk_posture}
              </p>
              <p
                className="text-[10px] mt-1 leading-snug"
                style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
              >
                {edge.risk_reason}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 shrink-0">
              {[
                { l: "PLAY",    v: edge.play_count,    c: "var(--positive)" },
                { l: "WATCH",   v: edge.watch_count,   c: "var(--warn)" },
                { l: "CAUTION", v: edge.caution_count, c: "#f87171" },
                { l: "PASS",    v: edge.pass_count,    c: "var(--text-dim)" },
              ].map((item) => (
                <div key={item.l} className="text-right">
                  <p className="term-label">{item.l}</p>
                  <p
                    className="text-xl tabular-nums leading-none"
                    style={{ color: item.c, fontFamily: "'DM Mono', monospace" }}
                  >
                    {item.v}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* top plays */}
          {edge.top_plays.length > 0 && (
            <div>
              <p className="term-label mb-2">TOP PLAY CANDIDATES</p>
              <div className="rounded overflow-hidden" style={panel}>
                {edge.top_plays.map((race, i) => (
                  <div key={race.race_id} style={{ borderTop: i > 0 ? "1px solid var(--border-dim)" : undefined }}>
                    <RaceRow race={race} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* all races with filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="term-label">ALL RACES — {edge.race_count} RACES</p>
              <div className="flex gap-1">
                {(["ALL", "PLAY", "WATCH", "CAUTION", "PASS"] as const).map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => setFilterLabel(lbl)}
                    className="px-2 py-0.5 rounded-sm text-[9px] tracking-wider transition-all"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      background: filterLabel === lbl ? "var(--bg-elevated)" : "transparent",
                      color: filterLabel === lbl ? "var(--gold)" : "var(--text-dim)",
                      border: `1px solid ${filterLabel === lbl ? "var(--gold-dim)" : "var(--border)"}`,
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded overflow-hidden" style={panel}>
              {filteredRaces.length > 0 ? (
                filteredRaces.map((race, i) => (
                  <div key={race.race_id} style={{ borderTop: i > 0 ? "1px solid var(--border-dim)" : undefined }}>
                    <RaceRow race={race} />
                  </div>
                ))
              ) : (
                <p
                  className="px-4 py-6 text-center text-xs"
                  style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
                >
                  {filterLabel === "ALL" ? "レースデータなし" : `${filterLabel}シグナルのレースなし`}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && !edge && !error && (
        <div
          className="rounded px-4 py-8 text-center"
          style={panel}
        >
          <p className="term-label">NO DATA</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
            選択日のレースデータがありません。同期してください。
          </p>
        </div>
      )}
    </div>
  );
}
