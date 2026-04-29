"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchRace, fetchTicketSuggestions, savePrediction } from "@/lib/api";
import {
  RaceInfo,
  TicketSuggestion,
  PredictionMode,
  TicketType,
  MODE_LABELS,
  TICKET_TYPE_LABELS,
} from "@/types";
import TicketSuggestionCard from "@/components/Analysis/TicketSuggestion";

const TICKET_TABS: TicketType[] = ["tan", "umaren", "wide", "sanren_fuku"];

export default function TicketsPage() {
  const params = useParams();
  const raceId = params.raceId as string;

  const [race, setRace] = useState<RaceInfo | null>(null);
  const [suggestions, setSuggestions] = useState<TicketSuggestion[]>([]);
  const [mode, setMode] = useState<PredictionMode>("standard");
  const [budget, setBudget] = useState(3000);
  const [activeTab, setActiveTab] = useState<TicketType>("tan");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSuggestions = useCallback(async (m: PredictionMode, b: number) => {
    setLoading(true);
    try {
      const data = await fetchTicketSuggestions(raceId, m, b);
      setSuggestions(data);
    } catch {
      setError("提案の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => {
    if (!raceId) return;
    fetchRace(raceId)
      .then(setRace)
      .catch(() => setError("レース情報の取得に失敗しました"));
    loadSuggestions(mode, budget);
  }, [raceId, loadSuggestions, mode, budget]);

  const handleModeChange = (m: PredictionMode) => {
    setMode(m);
    loadSuggestions(m, budget);
  };

  const handleBudgetChange = (b: number) => {
    setBudget(b);
    loadSuggestions(mode, b);
  };

  const activeSuggestion = suggestions.find((s) => s.ticket_type === activeTab);

  const handleSave = async () => {
    if (!activeSuggestion) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await savePrediction({
        race_id: raceId,
        mode,
        ticket_type: activeTab,
        buy_candidates: activeSuggestion.candidates,
        total_budget: activeSuggestion.total_budget,
        memo: `${TICKET_TYPE_LABELS[activeTab]} / ${MODE_LABELS[mode]}`,
      });
      setSaveMsg("予想を保存しました");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/races" className="hover:text-white">レース一覧</Link>
        <span>/</span>
        <Link href={`/races/${raceId}`} className="hover:text-white">
          {race?.race_name ?? raceId}
        </Link>
        <span>/</span>
        <span className="text-white">券種別提案</span>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* レース情報 */}
      {race && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h2 className="text-xl font-bold text-white">{race.race_name}</h2>
          <p className="text-slate-400 text-sm mt-1">
            {race.venue} / {race.surface === "turf" ? "芝" : "ダート"}{race.distance}m
          </p>
        </div>
      )}

      {/* コントロール */}
      <div className="flex flex-wrap gap-6 items-end">
        <div>
          <p className="text-slate-400 text-sm mb-2">分析モード</p>
          <div className="flex gap-2">
            {(["conservative", "standard", "aggressive"] as PredictionMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
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
        </div>

        <div>
          <p className="text-slate-400 text-sm mb-2">予算</p>
          <div className="flex gap-2">
            {[1000, 2000, 3000, 5000].map((b) => (
              <button
                key={b}
                onClick={() => handleBudgetChange(b)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  budget === b
                    ? "bg-blue-700 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {b.toLocaleString()}円
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 券種タブ */}
      <div className="flex gap-2 border-b border-slate-700 pb-0">
        {TICKET_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t
                ? "border-green-500 text-green-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {TICKET_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* 提案表示 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : activeSuggestion ? (
        <div className="space-y-4">
          <TicketSuggestionCard suggestion={activeSuggestion} />

          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              ※ これは参考情報です。馬券購入は自己判断でお願いします。
            </p>
            <div className="flex items-center gap-3">
              {saveMsg && (
                <span
                  className={`text-sm ${
                    saveMsg.includes("失敗") ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {saveMsg}
                </span>
              )}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors print:hidden"
                style={{ backgroundColor: "var(--turf-light)", color: "var(--gold)", border: "1px solid var(--turf-light)" }}
              >
                🖨 印刷
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-700 hover:bg-green-600 disabled:bg-slate-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? "保存中..." : "この予想を保存"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          この券種の提案データがありません
        </div>
      )}

      {/* 全券種サマリー */}
      {!loading && suggestions.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-3">全券種サマリー</h3>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-xs">
                  <th className="px-4 py-2 text-left">券種</th>
                  <th className="px-4 py-2 text-left">概要</th>
                  <th className="px-4 py-2 text-right">予算</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <tr
                    key={s.ticket_type}
                    className={`border-t border-slate-700 cursor-pointer hover:bg-slate-700 ${
                      activeTab === s.ticket_type ? "bg-slate-700/50" : ""
                    }`}
                    onClick={() => setActiveTab(s.ticket_type)}
                  >
                    <td className="px-4 py-2 text-white font-medium">
                      {TICKET_TYPE_LABELS[s.ticket_type]}
                    </td>
                    <td className="px-4 py-2 text-slate-400">{s.summary}</td>
                    <td className="px-4 py-2 text-right text-green-400">
                      {s.total_budget.toLocaleString()}円
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
