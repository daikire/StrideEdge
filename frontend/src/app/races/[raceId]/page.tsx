"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchRace, fetchEntries, fetchAnalysis, fetchMemo, saveMemo } from "@/lib/api";
import { RaceInfo, EntryInfo, AnalysisResult, PredictionMode, SURFACE_LABELS, MODE_LABELS } from "@/types";
import HorseTable from "@/components/Race/HorseTable";
import ReasonPanel from "@/components/Analysis/ReasonPanel";
import Badge from "@/components/Common/Badge";

export default function RaceAnalysisPage() {
  const params = useParams();
  const raceId = params.raceId as string;

  const [race, setRace] = useState<RaceInfo | null>(null);
  const [entries, setEntries] = useState<EntryInfo[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([]);
  const [mode, setMode] = useState<PredictionMode>("standard");
  const [selectedHorse, setSelectedHorse] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);

  useEffect(() => {
    if (!raceId) return;
    // raceId が変わるたびに全状態をリセット（戻る→別レース選択時のバグ対策）
    setLoading(true);
    setError(null);
    setRace(null);
    setEntries([]);
    setAnalysis([]);
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
        const analysisData = await fetchAnalysis(raceId, mode);
        if (cancelled) return;
        setAnalysis(analysisData);
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
      <div className="space-y-4">
        <div className="h-24 bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !race) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400">{error ?? "レースが見つかりません"}</p>
        <Link href="/races" className="text-green-400 hover:underline mt-4 inline-block">
          ← レース一覧に戻る
        </Link>
      </div>
    );
  }

  const surfaceLabel = SURFACE_LABELS[race.surface as keyof typeof SURFACE_LABELS] ?? race.surface;

  return (
    <div className="space-y-6">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/races" className="hover:text-white">レース一覧</Link>
        <span>/</span>
        <span className="text-white">{race.race_name}</span>
      </div>

      {/* レース情報ヘッダー */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 text-sm font-mono">R{race.race_number}</span>
              {race.grade && (
                <Badge
                  label={race.grade}
                  color={race.grade === "G1" ? "yellow" : race.grade === "G2" ? "gray" : "blue"}
                />
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">{race.race_name}</h2>
            <div className="flex gap-4 mt-2 text-sm text-slate-400">
              <span>{race.venue}</span>
              <span>{surfaceLabel} {race.distance}m</span>
              {race.race_class && <span>{race.race_class}</span>}
              <span>{entries.length}頭</span>
            </div>
          </div>
          <Link
            href={`/races/${raceId}/tickets`}
            className="bg-green-700 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            券種別提案 →
          </Link>
        </div>
      </div>

      {/* モード切替 */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">分析モード:</span>
        {(["conservative", "standard", "aggressive"] as PredictionMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? "bg-green-700 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 出走馬テーブル */}
        <div className="lg:col-span-2">
          <h3 className="text-white font-semibold mb-3">スコアランキング</h3>
          {analysis.length > 0 ? (
            <HorseTable
              results={analysis}
              onSelectHorse={setSelectedHorse}
              selectedHorseId={selectedHorse?.horse_id}
            />
          ) : (
            <p className="text-slate-500">分析データがありません</p>
          )}
        </div>

        {/* 根拠パネル */}
        <div>
          <h3 className="text-white font-semibold mb-3">
            {selectedHorse ? `${selectedHorse.horse_name} の根拠` : "馬を選択"}
          </h3>
          {selectedHorse ? (
            <ReasonPanel result={selectedHorse} />
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center text-slate-500 text-sm">
              テーブルの馬をクリックすると根拠を表示します
            </div>
          )}
        </div>
      </div>

      {/* レースメモ */}
      <div className="rounded-xl p-5" style={{ backgroundColor: "var(--turf-dark)", border: "1px solid var(--turf-light)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm" style={{ color: "var(--gold)" }}>レースメモ</h3>
          {memoSaved && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "#14401e", color: "#86efac" }}>保存しました</span>
          )}
        </div>
        <textarea
          className="w-full rounded-lg p-3 text-sm resize-none outline-none focus:ring-1"
          rows={4}
          placeholder="このレースへの気づき・注目馬メモなどを記録..."
          value={memo}
          onChange={(e) => { setMemo(e.target.value); setMemoSaved(false); }}
          style={{
            backgroundColor: "var(--turf-mid)",
            border: "1px solid var(--turf-light)",
            color: "var(--cream)",
            caretColor: "var(--gold)",
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
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: memoSaving ? "var(--turf-light)" : "var(--turf-light)",
              color: memoSaving ? "#4a6e56" : "var(--gold)",
              border: "1px solid var(--turf-light)",
            }}
          >
            {memoSaving ? "保存中..." : "メモを保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
