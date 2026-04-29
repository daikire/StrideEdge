"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchRace, fetchEntries, fetchAnalysis, fetchMemo, saveMemo, fetchEdgeSignal } from "@/lib/api";
import { RaceInfo, EntryInfo, AnalysisResult, PredictionMode, SURFACE_LABELS, MODE_LABELS, EdgeSignal } from "@/types";
import HorseTable from "@/components/Race/HorseTable";
import ReasonPanel from "@/components/Analysis/ReasonPanel";
import EdgeBadge from "@/components/Analysis/EdgeBadge";
import OverhypedAlert from "@/components/Analysis/OverhypedAlert";
import EVChart from "@/components/Analysis/EVChart";
import Badge from "@/components/Common/Badge";

const panel = { background: "var(--bg-panel)", border: "1px solid var(--border)" } as const;

export default function RaceAnalysisPage() {
  const params = useParams();
  const raceId = params.raceId as string;

  const [race, setRace] = useState<RaceInfo | null>(null);
  const [entries, setEntries] = useState<EntryInfo[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([]);
  const [edge, setEdge] = useState<EdgeSignal | null>(null);
  const [mode, setMode] = useState<PredictionMode>("standard");
  const [selectedHorse, setSelectedHorse] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);

  useEffect(() => {
    if (!raceId) return;
    setLoading(true);
    setError(null);
    setRace(null);
    setEntries([]);
    setAnalysis([]);
    setEdge(null);
    setSelectedHorse(null);
    setMemo("");
    setMemoSaved(false);

    let cancelled = false;

    async function load() {
      try {
        const [raceData, entriesData, memoData] = await Promise.all([
          fetchRace(raceId),
          fetchEntries(raceId),
          fetchMemo(raceId).catch(() => ""),
        ]);
        if (cancelled) return;
        setRace(raceData);
        setEntries(entriesData);
        setMemo(memoData);

        const [analysisData, edgeData] = await Promise.all([
          fetchAnalysis(raceId, mode),
          fetchEdgeSignal(raceId).catch(() => null),
        ]);
        if (cancelled) return;
        setAnalysis(analysisData);
        setEdge(edgeData);
        if (analysisData.length > 0) setSelectedHorse(analysisData[0]);
      } catch {
        if (!cancelled) setError("データの取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => { cancelled = true; };
  }, [raceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!raceId || loading) return;
    let cancelled = false;
    fetchAnalysis(raceId, mode)
      .then((data) => {
        if (cancelled) return;
        setAnalysis(data);
        setSelectedHorse(data[0] ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 rounded animate-pulse" style={{ background: "var(--bg-panel)" }} />
        <div className="h-48 rounded animate-pulse" style={{ background: "var(--bg-panel)" }} />
      </div>
    );
  }

  if (error || !race) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "var(--negative)" }}>{error ?? "レースが見つかりません"}</p>
        <Link href="/races" className="mt-4 inline-block text-sm" style={{ color: "var(--positive)" }}>
          ← RACES
        </Link>
      </div>
    );
  }

  const surfaceLabel = SURFACE_LABELS[race.surface as keyof typeof SURFACE_LABELS] ?? race.surface;

  return (
    <div className="space-y-4">
      {/* breadcrumb */}
      <div
        className="flex items-center gap-2 text-[10px] tracking-widest"
        style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
      >
        <Link href="/races" style={{ color: "var(--text-secondary)" }}>RACES</Link>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>R{race.race_number}</span>
      </div>

      {/* race header */}
      <div className="rounded p-4" style={panel}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="text-[10px] tabular-nums"
                style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
              >
                R{race.race_number}
              </span>
              {race.grade && (
                <Badge
                  label={race.grade}
                  color={race.grade === "G1" ? "yellow" : race.grade === "G2" ? "gray" : "blue"}
                />
              )}
              {edge && <EdgeBadge label={edge.label} size="sm" />}
            </div>
            <h2
              className="text-xl font-semibold leading-tight"
              style={{ color: "var(--text-primary)", fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {race.race_name}
            </h2>
            <div
              className="flex flex-wrap gap-3 mt-1.5 text-[10px] tabular-nums"
              style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
            >
              <span>{race.venue}</span>
              <span>{surfaceLabel} {race.distance}m</span>
              {race.race_class && <span>{race.race_class}</span>}
              <span>{entries.length}頭</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href={`/races/${raceId}/tickets`}
              className="text-[10px] tracking-widest px-3 py-1.5 rounded transition-all"
              style={{
                background: "var(--gold)",
                color: "var(--bg-base)",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              TICKETS →
            </Link>
          </div>
        </div>

        {/* edge signal detail */}
        {edge && (
          <div
            className="mt-3 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3"
            style={{ borderTop: "1px solid var(--border-dim)" }}
          >
            <div>
              <p className="term-label">EV RATIO</p>
              <p
                className="text-lg tabular-nums"
                style={{ color: "var(--gold)", fontFamily: "'DM Mono', monospace" }}
              >
                {edge.ev_ratio.toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="term-label">EV SPREAD</p>
              <p
                className="text-lg tabular-nums"
                style={{ color: edge.ev_spread >= 5 ? "var(--positive)" : "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
              >
                {edge.ev_spread.toFixed(1)}pt
              </p>
            </div>
            <div>
              <p className="term-label">VOLATILITY</p>
              <p
                className="text-lg tabular-nums"
                style={{ color: edge.volatility_index >= 40 ? "var(--warn)" : "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
              >
                {edge.volatility_index.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="term-label">BET ADVICE</p>
              <p
                className="text-[10px] leading-snug mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {edge.bet_type_advice}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* overhyped alert */}
      {edge && edge.overhyped.length > 0 && (
        <OverhypedAlert horses={edge.overhyped} />
      )}

      {/* mode selector */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] tracking-widest"
          style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
        >
          MODE:
        </span>
        {(["conservative", "standard", "aggressive"] as PredictionMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-3 py-1 rounded text-[10px] tracking-wider transition-all"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: mode === m ? "var(--bg-elevated)" : "var(--bg-panel)",
              color: mode === m ? "var(--gold)" : "var(--text-secondary)",
              border: `1px solid ${mode === m ? "var(--gold-dim)" : "var(--border)"}`,
            }}
          >
            {MODE_LABELS[m].toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* score ranking */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="term-label mb-2">SCORE RANKING</p>
            {analysis.length > 0 ? (
              <HorseTable
                results={analysis}
                onSelectHorse={setSelectedHorse}
                selectedHorseId={selectedHorse?.horse_id}
              />
            ) : (
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>分析データがありません</p>
            )}
          </div>

          {/* EV chart */}
          {analysis.length > 0 && (
            <div className="rounded p-4" style={panel}>
              <EVChart results={analysis} maxDisplay={8} />
            </div>
          )}
        </div>

        {/* reason panel */}
        <div>
          <p className="term-label mb-2">
            {selectedHorse ? `${selectedHorse.horse_name} — ANALYSIS` : "SELECT HORSE"}
          </p>
          {selectedHorse ? (
            <ReasonPanel result={selectedHorse} />
          ) : (
            <div
              className="rounded p-6 text-center text-xs"
              style={{ ...panel, color: "var(--text-dim)" }}
            >
              テーブルの馬を選択すると根拠を表示
            </div>
          )}
        </div>
      </div>

      {/* race memo */}
      <div className="rounded p-4" style={panel}>
        <div className="flex items-center justify-between mb-2">
          <p className="term-label">RACE MEMO</p>
          {memoSaved && (
            <span
              className="text-[9px] tracking-widest px-2 py-0.5 rounded-sm"
              style={{ background: "#0a2010", color: "var(--positive)", fontFamily: "'DM Mono', monospace" }}
            >
              SAVED
            </span>
          )}
        </div>
        <textarea
          className="w-full rounded p-3 text-sm resize-none outline-none focus:ring-1"
          rows={4}
          placeholder="このレースへの気づき・注目馬メモなど..."
          value={memo}
          onChange={(e) => { setMemo(e.target.value); setMemoSaved(false); }}
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            caretColor: "var(--gold)",
            fontFamily: "'DM Mono', monospace",
            fontSize: "12px",
          }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={async () => {
              setMemoSaving(true);
              await saveMemo(raceId, memo).catch(() => {});
              setMemoSaving(false);
              setMemoSaved(true);
              setTimeout(() => setMemoSaved(false), 3000);
            }}
            disabled={memoSaving}
            className="px-3 py-1 rounded text-[10px] tracking-widest transition-all"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: memoSaving ? "var(--text-dim)" : "var(--gold)",
              cursor: memoSaving ? "not-allowed" : "pointer",
            }}
          >
            {memoSaving ? "SAVING..." : "SAVE MEMO"}
          </button>
        </div>
      </div>
    </div>
  );
}
