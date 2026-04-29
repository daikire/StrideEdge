"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPredictions, fetchResults } from "@/lib/api";
import { PredictionResponse, RaceResultResponse, MODE_LABELS, TICKET_TYPE_LABELS, PredictionMode, TicketType } from "@/types";

type Tab = "predictions" | "results";

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("predictions");
  const [predictions, setPredictions] = useState<PredictionResponse[]>([]);
  const [results, setResults] = useState<RaceResultResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [preds, res] = await Promise.all([
          fetchPredictions(),
          fetchResults(),
        ]);
        setPredictions(preds);
        setResults(res);
      } catch {
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">過去履歴</h2>
        <p className="text-slate-400 text-sm mt-1">保存した予想とレース結果を確認できます</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-0 border-b border-slate-700">
        {[
          { id: "predictions" as Tab, label: `予想履歴 (${predictions.length})` },
          { id: "results" as Tab, label: `結果履歴 (${results.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-green-500 text-green-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
      ) : tab === "predictions" ? (
        <div>
          {predictions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 mb-3">保存した予想はありません</p>
              <Link href="/races" className="text-green-400 hover:underline text-sm">
                レース一覧から予想を作成 →
              </Link>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-xs">
                    <th className="px-4 py-3 text-left">レース</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">券種</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">モード</th>
                    <th className="px-4 py-3 text-right">予算</th>
                    <th className="px-4 py-3 text-left">メモ</th>
                    <th className="px-4 py-3 text-right hidden lg:table-cell">日時</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.id} className="border-t border-slate-700 hover:bg-slate-750">
                      <td className="px-4 py-3">
                        <Link
                          href={`/races/${p.race_id}`}
                          className="text-green-400 hover:underline"
                        >
                          {p.race_name ?? p.race_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300 hidden md:table-cell">
                        {p.ticket_type
                          ? TICKET_TYPE_LABELS[p.ticket_type as TicketType] ?? p.ticket_type
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300 hidden md:table-cell">
                        {MODE_LABELS[p.mode as PredictionMode] ?? p.mode}
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 font-medium">
                        {p.total_budget.toLocaleString()}円
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.memo || "-"}</td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs hidden lg:table-cell">
                        {p.created_at.slice(0, 16)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div>
          {results.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 mb-3">登録された結果はありません</p>
              <Link href="/results" className="text-green-400 hover:underline text-sm">
                結果を登録する →
              </Link>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-xs">
                    <th className="px-4 py-3 text-left">レース</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">開催</th>
                    <th className="px-4 py-3 text-center">1着</th>
                    <th className="px-4 py-3 text-center">2着</th>
                    <th className="px-4 py-3 text-center">3着</th>
                    <th className="px-4 py-3 text-right hidden lg:table-cell">登録日時</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-t border-slate-700 hover:bg-slate-750">
                      <td className="px-4 py-3 text-white">
                        {r.race_name ?? r.race_id}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                        {r.venue} {r.race_date}
                      </td>
                      <td className="px-4 py-3 text-center text-yellow-400 font-bold">
                        {r.first_place}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300 font-bold">
                        {r.second_place}
                      </td>
                      <td className="px-4 py-3 text-center text-amber-600 font-bold">
                        {r.third_place}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs hidden lg:table-cell">
                        {r.registered_at.slice(0, 16)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
