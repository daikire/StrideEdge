"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchRaceDates, fetchRaces, fetchPredictions } from "@/lib/api";
import { RaceInfo, PredictionResponse } from "@/types";

const MODE_LABELS: Record<string, string> = {
  conservative: "堅め",
  standard: "標準",
  aggressive: "穴狙い",
};

const QUICK_LINKS = [
  { href: "/predictions", label: "予想一覧",  icon: "🎯", desc: "全レースの買い目を確認" },
  { href: "/calendar",    label: "カレンダー", icon: "📅", desc: "開催日・Win5を確認" },
  { href: "/history",     label: "過去履歴",   icon: "📋", desc: "予想履歴を確認" },
  { href: "/results",     label: "結果登録",   icon: "✅", desc: "着順を入力" },
];

const card = {
  background: "var(--turf-dark)",
  border: "1px solid var(--turf-light)",
};

export default function DashboardPage() {
  const [races, setRaces] = useState<RaceInfo[]>([]);
  const [predictions, setPredictions] = useState<PredictionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [dates, preds] = await Promise.all([fetchRaceDates(), fetchPredictions()]);
        if (dates.length > 0) setRaces(await fetchRaces(dates[0]));
        setPredictions(preds.slice(0, 5));
      } catch {
        setError("APIに接続できません。バックエンドが起動しているか確認してください。");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ヒーローバナー */}
      <div
        className="rounded-2xl px-6 py-5 flex items-center justify-between overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, var(--turf-mid) 0%, #0d3520 60%, #1a4a2a 100%)",
          border: "1px solid var(--turf-light)",
        }}
      >
        <div className="relative z-10">
          <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: "var(--gold)" }}>
            STRIDE EDGE
          </p>
          <h2 className="text-2xl font-extrabold tracking-wide" style={{ color: "var(--cream)" }}>
            競馬予想支援システム
          </h2>
          <p className="text-sm mt-1" style={{ color: "#8eb89a" }}>
            スコア分析・馬券提案・Win5対応
          </p>
        </div>
        <div className="text-6xl opacity-20 absolute right-6 top-1/2 -translate-y-1/2 select-none">
          🏇
        </div>
        <Link
          href="/predictions"
          className="relative z-10 shrink-0 text-sm font-bold px-4 py-2 rounded-lg transition-all"
          style={{
            background: "var(--gold)",
            color: "#0d1f12",
          }}
        >
          今日の予想 →
        </Link>
      </div>

      {error && (
        <div
          className="rounded-xl p-4"
          style={{ background: "#2a0e0e", border: "1px solid #7f1d1d", color: "#fca5a5" }}
        >
          <p className="font-semibold">接続エラー</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "直近レース数",
            value: loading ? null : races.length,
            sub: "最新開催日",
            color: "var(--gold)",
          },
          {
            label: "保存済み予想",
            value: loading ? null : predictions.length,
            sub: "直近5件",
            color: "#34d399",
          },
          {
            label: "分析モード",
            value: "標準",
            sub: "設定から変更可",
            color: "#60a5fa",
            isText: true,
          },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-4" style={card}>
            <p className="text-xs mb-1" style={{ color: "#7a9e86" }}>{item.label}</p>
            {item.value === null ? (
              <div className="h-8 rounded animate-pulse mt-1" style={{ background: "var(--turf-light)" }} />
            ) : (
              <p className="text-3xl font-extrabold" style={{ color: item.color }}>
                {item.value}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: "#4a6e56" }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* クイックアクセス */}
      <div>
        <h3 className="font-bold text-sm mb-3 tracking-widest uppercase" style={{ color: "var(--gold)" }}>
          Quick Access
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl p-4 text-center transition-all group"
              style={card}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--gold)";
                (e.currentTarget as HTMLElement).style.background = "var(--turf-mid)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--turf-light)";
                (e.currentTarget as HTMLElement).style.background = "var(--turf-dark)";
              }}
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-sm font-semibold" style={{ color: "var(--cream)" }}>{item.label}</p>
              <p className="text-xs mt-1" style={{ color: "#4a6e56" }}>{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* 直近レース */}
      {!loading && races.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm tracking-widest uppercase" style={{ color: "var(--gold)" }}>
              直近のレース
            </h3>
            <Link href="/races" className="text-xs" style={{ color: "#34d399" }}>
              すべて見る →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {races.slice(0, 6).map((race) => (
              <Link key={race.race_id} href={`/races/${race.race_id}`}>
                <div
                  className="rounded-xl p-3 transition-all"
                  style={card}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--gold)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--turf-light)"}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono" style={{ color: "#4a6e56" }}>R{race.race_number}</span>
                    {race.grade && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "#3d2a00", color: "var(--gold)" }}
                      >
                        {race.grade}
                      </span>
                    )}
                    {race.is_win5 && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "#1e3a5f", color: "#60a5fa" }}
                      >
                        Win5
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--cream)" }}>
                    {race.race_name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#7a9e86" }}>
                    {race.venue} / {race.surface === "turf" ? "芝" : "ダート"}{race.distance}m
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 最新予想 */}
      {!loading && predictions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm tracking-widest uppercase" style={{ color: "var(--gold)" }}>
              最新の予想
            </h3>
            <Link href="/history" className="text-xs" style={{ color: "#34d399" }}>
              履歴を見る →
            </Link>
          </div>
          <div className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--turf-mid)" }}>
                  {["レース", "モード", "予算", "日時"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2 text-xs font-semibold text-left ${i >= 3 ? "hidden md:table-cell" : ""}`}
                      style={{ color: "#7a9e86" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predictions.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{ borderTop: "1px solid var(--turf-light)" }}
                  >
                    <td className="px-4 py-2.5" style={{ color: "var(--cream)" }}>
                      {p.race_name ?? p.race_id}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#8eb89a" }}>
                      {MODE_LABELS[p.mode] ?? p.mode}
                    </td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--gold)" }}>
                      {p.total_budget.toLocaleString()}円
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-xs" style={{ color: "#4a6e56" }}>
                      {p.created_at.slice(0, 16)}
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
