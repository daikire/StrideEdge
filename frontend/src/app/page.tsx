"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchRaceDates, fetchRaces, fetchPredictions, fetchTodayEdge } from "@/lib/api";
import { RaceInfo, PredictionResponse, TodayEdge } from "@/types";
import EdgeBadge from "@/components/Analysis/EdgeBadge";

const MODE_LABELS: Record<string, string> = {
  conservative: "CONS",
  standard:     "STD",
  aggressive:   "AGG",
};

const MODULES = [
  { href: "/predictions", code: "SIG", label: "SIGNALS",  sub: "全レースの買い目" },
  { href: "/calendar",    code: "CAL", label: "CALENDAR", sub: "開催日・Win5" },
  { href: "/history",     code: "LOG", label: "HISTORY",  sub: "予想履歴" },
  { href: "/results",     code: "REC", label: "RECORD",   sub: "着順入力" },
];

const panel = {
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
} as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="term-label mb-2">{children}</p>
  );
}

export default function DashboardPage() {
  const [races, setRaces] = useState<RaceInfo[]>([]);
  const [predictions, setPredictions] = useState<PredictionResponse[]>([]);
  const [todayEdge, setTodayEdge] = useState<TodayEdge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [dates, preds] = await Promise.all([fetchRaceDates(), fetchPredictions()]);
        const firstDate = dates[0] ?? "";
        if (firstDate) {
          const [racesData, edgeData] = await Promise.all([
            fetchRaces(firstDate),
            fetchTodayEdge(firstDate).catch(() => null),
          ]);
          setRaces(racesData);
          setTodayEdge(edgeData);
        }
        setPredictions(preds.slice(0, 8));
      } catch {
        setError("API CONNECTION FAILED");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalBudget = predictions.reduce((s, p) => s + p.total_budget, 0);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">

      {/* Terminal header bar */}
      <div
        className="rounded px-4 py-3 flex items-center justify-between"
        style={{
          background: "linear-gradient(90deg, var(--bg-elevated) 0%, var(--bg-panel) 100%)",
          border: "1px solid var(--border-bright)",
        }}
      >
        <div>
          <p
            className="text-xs tracking-widest mb-0.5"
            style={{ color: "var(--gold)", fontFamily: "'DM Mono', monospace" }}
          >
            STRIDEEDGE
          </p>
          <h2
            className="text-xl font-semibold leading-none tracking-tight"
            style={{ color: "var(--text-primary)", fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Investment Terminal
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="term-label">ACTIVE SIGNALS</p>
            <p
              className="text-2xl tabular-nums leading-none"
              style={{ color: "var(--gold)", fontFamily: "'DM Mono', monospace" }}
            >
              {loading ? "—" : predictions.length}
            </p>
          </div>
          <Link
            href="/predictions"
            className="rounded px-3 py-1.5 text-xs tracking-widest transition-all"
            style={{
              background: "var(--gold)",
              color: "var(--bg-base)",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            VIEW SIGNALS
          </Link>
        </div>
      </div>

      {error && (
        <div
          className="rounded px-4 py-2 flex items-center gap-2"
          style={{ background: "#1a0505", border: "1px solid var(--negative)", color: "var(--negative)" }}
        >
          <span className="term-label" style={{ color: "var(--negative)" }}>ERR</span>
          <span className="text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{error}</span>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          {
            label: "RACES TODAY",
            value: loading ? null : races.length,
            unit: "races",
            color: "var(--text-primary)",
          },
          {
            label: "SAVED SIGNALS",
            value: loading ? null : predictions.length,
            unit: "signals",
            color: "var(--positive)",
          },
          {
            label: "TOTAL BUDGET",
            value: loading ? null : totalBudget.toLocaleString(),
            unit: "JPY",
            color: "var(--gold)",
          },
          {
            label: "ACTIVE MODE",
            value: "STD",
            unit: "standard",
            color: "var(--text-secondary)",
            isText: true,
          },
        ].map((item, i) => (
          <div key={i} className="rounded p-3" style={panel}>
            <p className="term-label">{item.label}</p>
            {item.value === null ? (
              <div
                className="h-7 rounded animate-pulse mt-1"
                style={{ background: "var(--bg-elevated)" }}
              />
            ) : (
              <p
                className="text-2xl tabular-nums leading-none mt-1"
                style={{ color: item.color, fontFamily: "'DM Mono', monospace" }}
              >
                {item.value}
              </p>
            )}
            <p
              className="text-[10px] mt-1 tracking-widest uppercase"
              style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
            >
              {item.unit}
            </p>
          </div>
        ))}
      </div>

      {/* Today's Edge brief */}
      {!loading && todayEdge && todayEdge.race_count > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>TODAY&apos;S EDGE — MORNING BRIEF</SectionLabel>
            <Link
              href="/edge"
              className="text-[10px] tracking-widest"
              style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
            >
              FULL BRIEF →
            </Link>
          </div>
          <div
            className="rounded p-3 flex flex-wrap items-center gap-4"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-bright)" }}
          >
            <div>
              <p className="term-label">POSTURE</p>
              <p
                className="text-lg tabular-nums tracking-widest"
                style={{
                  color: todayEdge.risk_posture === "AGGRESSIVE" ? "var(--positive)"
                    : todayEdge.risk_posture === "CONSERVATIVE" ? "var(--warn)"
                    : "var(--gold)",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {todayEdge.risk_posture}
              </p>
            </div>
            <div className="flex gap-4">
              {[
                { l: "PLAY",  v: todayEdge.play_count,    c: "var(--positive)" },
                { l: "WATCH", v: todayEdge.watch_count,   c: "var(--warn)" },
                { l: "PASS",  v: todayEdge.pass_count,    c: "var(--text-dim)" },
              ].map((item) => (
                <div key={item.l}>
                  <p className="term-label">{item.l}</p>
                  <p
                    className="text-lg tabular-nums"
                    style={{ color: item.c, fontFamily: "'DM Mono', monospace" }}
                  >
                    {item.v}
                  </p>
                </div>
              ))}
            </div>
            {todayEdge.top_plays.length > 0 && (
              <div className="flex-1 min-w-0">
                <p className="term-label mb-1">TOP PLAY</p>
                <div className="flex items-center gap-2">
                  <EdgeBadge label={todayEdge.top_plays[0].label} size="sm" />
                  <Link href={`/races/${todayEdge.top_plays[0].race_id}`}>
                    <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                      R{todayEdge.top_plays[0].race_number} {todayEdge.top_plays[0].race_name}
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module grid */}
      <div>
        <SectionLabel>MODULES</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded p-3 transition-all group"
              style={panel}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--gold)";
                (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.background = "var(--bg-panel)";
              }}
            >
              <p
                className="text-[10px] tracking-widest mb-1.5"
                style={{ color: "var(--gold-dim)", fontFamily: "'DM Mono', monospace" }}
              >
                [{m.code}]
              </p>
              <p
                className="text-sm font-semibold tracking-wide"
                style={{ color: "var(--text-primary)", fontFamily: "'DM Mono', monospace" }}
              >
                {m.label}
              </p>
              <p
                className="text-[10px] mt-0.5"
                style={{ color: "var(--text-dim)" }}
              >
                {m.sub}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Race list + Signal list side by side on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Race list */}
        {!loading && races.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>RACE LIST — TODAY</SectionLabel>
              <Link
                href="/races"
                className="text-[10px] tracking-widest"
                style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
              >
                ALL →
              </Link>
            </div>
            <div className="rounded overflow-hidden" style={panel}>
              {races.slice(0, 8).map((race, i) => (
                <Link key={race.race_id} href={`/races/${race.race_id}`}>
                  <div
                    className="flex items-center gap-3 px-3 py-2 transition-all"
                    style={{
                      borderTop: i > 0 ? "1px solid var(--border-dim)" : undefined,
                    }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = ""}
                  >
                    <span
                      className="tabular-nums text-[10px] shrink-0 w-6 text-right"
                      style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
                    >
                      R{race.race_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                        {race.race_name}
                      </p>
                      <p
                        className="text-[10px] mt-0.5 tabular-nums"
                        style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
                      >
                        {race.venue} / {race.surface === "turf" ? "T" : "D"}{race.distance}m
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {race.grade && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-sm"
                          style={{ background: "var(--bg-base)", color: "var(--gold)", border: "1px solid var(--gold-dim)", fontFamily: "'DM Mono', monospace" }}
                        >
                          {race.grade}
                        </span>
                      )}
                      {race.is_win5 && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-sm"
                          style={{ background: "#0a1a2e", color: "#60a5fa", border: "1px solid #1e3a6e", fontFamily: "'DM Mono', monospace" }}
                        >
                          W5
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Signal log */}
        {!loading && predictions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>SIGNAL LOG</SectionLabel>
              <Link
                href="/history"
                className="text-[10px] tracking-widest"
                style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
              >
                ALL →
              </Link>
            </div>
            <div className="rounded overflow-hidden" style={panel}>
              <div
                className="grid px-3 py-1.5"
                style={{
                  gridTemplateColumns: "1fr 48px 72px 80px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {["RACE", "MODE", "BUDGET", "DATE"].map((h) => (
                  <p
                    key={h}
                    className="term-label"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {h}
                  </p>
                ))}
              </div>
              {predictions.map((p, i) => (
                <div
                  key={p.id}
                  className="grid px-3 py-2 items-center transition-all"
                  style={{
                    gridTemplateColumns: "1fr 48px 72px 80px",
                    borderTop: i > 0 ? "1px solid var(--border-dim)" : undefined,
                  }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = ""}
                >
                  <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                    {p.race_name ?? p.race_id}
                  </p>
                  <p
                    className="text-[10px] tabular-nums"
                    style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
                  >
                    {MODE_LABELS[p.mode] ?? p.mode}
                  </p>
                  <p
                    className="text-[10px] tabular-nums"
                    style={{ color: "var(--gold)", fontFamily: "'DM Mono', monospace" }}
                  >
                    {p.total_budget.toLocaleString()}
                  </p>
                  <p
                    className="text-[10px] tabular-nums hidden md:block"
                    style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
                  >
                    {p.created_at.slice(0, 10)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* empty state */}
      {!loading && !error && races.length === 0 && predictions.length === 0 && (
        <div
          className="rounded px-4 py-8 text-center"
          style={panel}
        >
          <p
            className="term-label mb-1"
            style={{ color: "var(--text-dim)" }}
          >
            NO DATA AVAILABLE
          </p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            同期ボタンでデータを取得してください
          </p>
        </div>
      )}

    </div>
  );
}
