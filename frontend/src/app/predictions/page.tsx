"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fetchRaceDates, fetchDailyPredictions } from "@/lib/api";
import {
  DailyRacePrediction,
  AnalysisResult,
  PredictionMode,
  TicketType,
  TICKET_TYPE_LABELS,
  SURFACE_LABELS,
  MODE_LABELS,
} from "@/types";

// ── 定数 ───────────────────────────────────────────────────
type ViewTab = "all" | "sanren_tan" | "win5";

const BACKTEST_STATS = {
  tan: 80,
  sanren_fuku: 100,
  sanren_tan: 80,
};

// ── 小コンポーネント ──────────────────────────────────────

function StatBadge({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "text-green-400" : value >= 60 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex flex-col items-center bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 min-w-[80px]">
      <span className={`text-xl font-bold tabular-nums ${color}`}>{value}%</span>
      <span className="text-slate-400 text-xs mt-0.5">{label}</span>
    </div>
  );
}

function OddsTag({ odds }: { odds?: number | null }) {
  if (odds == null) return <span className="text-slate-600 text-xs">-</span>;
  const style =
    odds <= 3
      ? "bg-red-900/60 text-red-300"
      : odds <= 8
      ? "bg-orange-900/60 text-orange-300"
      : odds <= 20
      ? "bg-slate-700 text-slate-300"
      : "bg-purple-900/60 text-purple-300";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${style}`}>
      {odds.toFixed(1)}倍
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "bg-yellow-500 text-black"
      : rank === 2
      ? "bg-slate-400 text-black"
      : rank === 3
      ? "bg-orange-600 text-white"
      : "bg-slate-700 text-slate-300";
  return (
    <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${style}`}>
      {rank}
    </span>
  );
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-slate-500";
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-400 w-8 text-right">{score}</span>
    </div>
  );
}

// ── レースヘッダー ────────────────────────────────────────

function RaceHeader({ race, prediction }: { race: DailyRacePrediction["race"]; prediction: DailyRacePrediction }) {
  const surface = SURFACE_LABELS[race.surface as keyof typeof SURFACE_LABELS] ?? race.surface;
  return (
    <div className="flex items-start justify-between gap-2 px-4 py-3 bg-slate-900/60 border-b border-slate-700">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 text-xs shrink-0">R{race.race_number}</span>
          <span className="text-white font-semibold text-sm truncate">{race.race_name}</span>
          {race.grade && (
            <span className="text-xs bg-yellow-800/60 text-yellow-300 px-1.5 py-0.5 rounded shrink-0">
              {race.grade}
            </span>
          )}
        </div>
        <p className="text-slate-400 text-xs mt-0.5">
          {race.venue} / {surface}{race.distance}m
        </p>
      </div>
      <Link
        href={`/races/${race.race_id}/tickets`}
        className="shrink-0 text-xs text-green-400 hover:text-green-300 border border-green-700/50 px-2 py-1 rounded whitespace-nowrap"
      >
        詳細 →
      </Link>
    </div>
  );
}

// ── 馬行 ──────────────────────────────────────────────────

function HorseRow({ r, isDark = false }: { r: AnalysisResult; isDark?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <RankBadge rank={r.rank} />
      <span className="text-slate-400 text-xs w-5 text-center tabular-nums shrink-0">
        {r.horse_number}
      </span>
      <span className="text-sm text-white flex-1 truncate min-w-0">{r.horse_name}</span>
      {r.jockey && (
        <span className="text-slate-500 text-xs hidden sm:block shrink-0">{r.jockey}</span>
      )}
      <OddsTag odds={r.odds} />
      <ScoreBar score={r.total_score} />
      {isDark && (
        <span className="shrink-0 text-[10px] bg-purple-800/60 text-purple-300 px-1 py-0.5 rounded">
          穴
        </span>
      )}
    </div>
  );
}

// ── チケット行 ────────────────────────────────────────────

function TicketRow({
  prediction,
  type,
}: {
  prediction: DailyRacePrediction;
  type: TicketType;
}) {
  const ticket = prediction.tickets.find((t) => t.ticket_type === type);
  if (!ticket || ticket.candidates.length === 0) {
    return <span className="text-slate-600 text-xs">-</span>;
  }
  return (
    <div className="space-y-0.5">
      {ticket.candidates.slice(0, type === "sanren_tan" ? 4 : 1).map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          {type === "sanren_tan" && (
            <span className="text-slate-600 w-3">{i + 1}.</span>
          )}
          <span className="text-white font-medium">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── 全レース表示カード ──────────────────────────────────

function AllRacesCard({ prediction }: { prediction: DailyRacePrediction }) {
  const { race, favorites, dark_horses } = prediction;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <RaceHeader race={race} prediction={prediction} />

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 有力候補 */}
        <div>
          <p className="text-[11px] font-bold text-green-400 mb-2 uppercase tracking-wide">
            有力候補
          </p>
          <div className="divide-y divide-slate-700/40">
            {favorites.map((r) => (
              <HorseRow key={r.horse_id} r={r} />
            ))}
            {favorites.length === 0 && (
              <p className="text-slate-600 text-xs py-2">データなし</p>
            )}
          </div>
        </div>

        {/* 逆穴場 */}
        <div>
          <p className="text-[11px] font-bold text-purple-400 mb-2 uppercase tracking-wide">
            逆穴場 <span className="text-slate-600 normal-case font-normal">（15倍以上）</span>
          </p>
          {dark_horses.length > 0 ? (
            <div className="divide-y divide-slate-700/40">
              {dark_horses.map((r) => (
                <HorseRow key={r.horse_id} r={r} isDark />
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-xs py-2">穴馬候補なし</p>
          )}
        </div>

        {/* 買い目サマリー */}
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="text-[11px] font-bold text-blue-400 mb-2 uppercase tracking-wide">
            買い目
          </p>
          <div className="space-y-1.5">
            {(["tan", "umaren", "wide", "sanren_fuku", "sanren_tan"] as TicketType[]).map((tt) => {
              const t = prediction.tickets.find((x) => x.ticket_type === tt);
              if (!t || t.candidates.length === 0) return null;
              const top = t.candidates[0];
              return (
                <div key={tt} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-500 w-12 shrink-0 pt-0.5">
                    {TICKET_TYPE_LABELS[tt]}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white font-medium">{top.label}</span>
                    {tt === "sanren_tan" && t.candidates[1] && (
                      <span className="text-slate-400">{t.candidates[1].label}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 3連単専用カード ───────────────────────────────────────

function SanrenTanCard({ prediction }: { prediction: DailyRacePrediction }) {
  const { race } = prediction;
  const surface = SURFACE_LABELS[race.surface as keyof typeof SURFACE_LABELS] ?? race.surface;
  const ticket = prediction.tickets.find((t) => t.ticket_type === "sanren_tan");

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <RaceHeader race={race} prediction={prediction} />
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 予想馬リスト */}
          <div>
            <p className="text-[11px] font-bold text-yellow-400 mb-2">軸馬 / 相手</p>
            <div className="divide-y divide-slate-700/40">
              {prediction.favorites.map((r) => (
                <HorseRow key={r.horse_id} r={r} />
              ))}
            </div>
          </div>

          {/* 買い目 */}
          <div>
            <p className="text-[11px] font-bold text-blue-400 mb-2">3連単 買い目</p>
            {ticket && ticket.candidates.length > 0 ? (
              <div className="space-y-2">
                {ticket.candidates.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-3 py-2"
                  >
                    <span className="text-slate-500 text-xs w-4 shrink-0">{i + 1}</span>
                    <span className="text-white font-medium text-sm">{c.label}</span>
                    <span className="ml-auto text-slate-400 text-xs">
                      {c.amount.toLocaleString()}円
                    </span>
                  </div>
                ))}
                <p className="text-slate-500 text-xs text-right pt-1">
                  合計: {ticket.total_budget.toLocaleString()}円
                </p>
              </div>
            ) : (
              <p className="text-slate-600 text-xs">データなし</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Win5パネル ────────────────────────────────────────────

function Win5Panel({ predictions }: { predictions: DailyRacePrediction[] }) {
  const picks = predictions.filter((p) => p.race.is_win5 && p.win5_pick).slice(0, 5);

  if (picks.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Win5対象レースがありません
      </div>
    );
  }

  const combo = picks.map((p) => `${p.win5_pick!.horse_number}番`).join(" / ");

  return (
    <div className="space-y-4">
      {/* 組み合わせ */}
      <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border border-yellow-700/40 rounded-xl p-4">
        <p className="text-yellow-400 font-bold text-sm mb-1">Win5 推奨組み合わせ</p>
        <p className="text-white text-lg font-bold">{combo}</p>
        <p className="text-slate-500 text-xs mt-1">各レースのスコア1位を軸とした組み合わせ</p>
      </div>

      {/* レース別 */}
      <div className="space-y-3">
        {picks.map((p, idx) => {
          const pick = p.win5_pick!;
          const surface =
            SURFACE_LABELS[p.race.surface as keyof typeof SURFACE_LABELS] ?? p.race.surface;
          // 同レースの次点候補（穴馬含む候補）
          const candidates = [
            ...p.favorites.slice(0, 3),
            ...p.dark_horses.slice(0, 1),
          ].filter((r, i, arr) => arr.findIndex((x) => x.horse_id === r.horse_id) === i);

          return (
            <div
              key={p.race.race_id}
              className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/60 border-b border-slate-700">
                <span className="text-yellow-500 font-bold text-sm shrink-0">
                  第{idx + 1}レース
                </span>
                <span className="text-white text-sm font-medium truncate">
                  {p.race.race_name}
                </span>
                <span className="text-slate-500 text-xs shrink-0">
                  {p.race.venue} {surface}{p.race.distance}m
                </span>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 軸 */}
                <div>
                  <p className="text-[11px] font-bold text-yellow-400 mb-2">軸（最有力）</p>
                  <div className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-3 py-2.5">
                    <RankBadge rank={1} />
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm">
                        {pick.horse_number}番 {pick.horse_name}
                      </p>
                      <p className="text-slate-400 text-xs">
                        スコア {pick.total_score}pt
                        {pick.odds != null && ` / オッズ ${pick.odds.toFixed(1)}倍`}
                        {pick.jockey && ` / ${pick.jockey}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ヒモ候補 */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 mb-2">ヒモ候補</p>
                  <div className="divide-y divide-slate-700/40">
                    {candidates
                      .filter((r) => r.horse_id !== pick.horse_id)
                      .slice(0, 3)
                      .map((r) => (
                        <HorseRow key={r.horse_id} r={r} isDark={p.dark_horses.some((d) => d.horse_id === r.horse_id)} />
                      ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 注意書き */}
      <p className="text-slate-600 text-xs text-center pb-2">
        ※ サンプルデータに基づく参考情報です。馬券購入は自己判断でお願いします。
      </p>
    </div>
  );
}

// ── メインページ ──────────────────────────────────────────

export default function PredictionsPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [mode, setMode] = useState<PredictionMode>("standard");
  const [predictions, setPredictions] = useState<DailyRacePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("all");

  useEffect(() => {
    fetchRaceDates()
      .then((d) => {
        setDates(d);
        if (d.length > 0) setSelectedDate(d[0]);
      })
      .catch(() => setError("日付の取得に失敗しました"));
  }, []);

  const load = useCallback(async (date: string, m: PredictionMode) => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailyPredictions(date, m, 3000);
      setPredictions(data);
    } catch {
      setError("予想データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) load(selectedDate, mode);
  }, [selectedDate, mode, load]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });

  // ── ローディングスケルトン ──────────────────────────
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden animate-pulse">
          <div className="h-12 bg-slate-900/60" />
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="h-3 bg-slate-700 rounded w-20" />
                {[...Array(3)].map((_, k) => (
                  <div key={k} className="h-7 bg-slate-700 rounded" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* ── ヘッダー ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">予想一覧</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            有力候補・逆穴場・買い目を全レース一括表示
          </p>
        </div>
        {/* バックテスト勝率バッジ */}
        <div className="flex gap-2 shrink-0">
          <StatBadge label="単勝" value={BACKTEST_STATS.tan} />
          <StatBadge label="3連複" value={BACKTEST_STATS.sanren_fuku} />
          <StatBadge label="3連単" value={BACKTEST_STATS.sanren_tan} />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* ── コントロール ── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        {/* 日付 */}
        <div className="flex-1 min-w-0">
          <p className="text-slate-500 text-xs mb-1.5">開催日</p>
          <div className="flex gap-1.5 flex-wrap">
            {dates.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedDate === d
                    ? "bg-green-700 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {formatDate(d)}
              </button>
            ))}
          </div>
        </div>

        {/* モード */}
        <div className="shrink-0">
          <p className="text-slate-500 text-xs mb-1.5">モード</p>
          <div className="flex gap-1.5">
            {(["conservative", "standard", "aggressive"] as PredictionMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-blue-700 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ビュータブ ── */}
      <div className="flex gap-0 border-b border-slate-700">
        {([
          { id: "all", label: "全レース" },
          { id: "sanren_tan", label: "3連単" },
          { id: "win5", label: "Win5" },
        ] as { id: ViewTab; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              viewTab === tab.id
                ? "border-green-500 text-green-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── コンテンツ ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : predictions.length === 0 ? (
        <div className="text-center py-16 text-slate-500">この日の予想データがありません</div>
      ) : viewTab === "all" ? (
        <div className="space-y-4">
          {predictions.map((p) => (
            <AllRacesCard key={p.race.race_id} prediction={p} />
          ))}
        </div>
      ) : viewTab === "sanren_tan" ? (
        <div className="space-y-4">
          {predictions.map((p) => (
            <SanrenTanCard key={p.race.race_id} prediction={p} />
          ))}
        </div>
      ) : (
        <Win5Panel predictions={predictions} />
      )}

      {!loading && predictions.length > 0 && (
        <p className="text-slate-700 text-xs text-center pb-2">
          ※ バックテスト結果: 単勝{BACKTEST_STATS.tan}% / 3連複{BACKTEST_STATS.sanren_fuku}% / 3連単{BACKTEST_STATS.sanren_tan}%（サンプルデータ5レース）
        </p>
      )}
    </div>
  );
}
