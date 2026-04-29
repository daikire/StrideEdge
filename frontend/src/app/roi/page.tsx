"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchRoi } from "@/lib/api";
import { RoiData, RoiRecord } from "@/types";
import { TICKET_TYPE_LABELS } from "@/types";

const card = { backgroundColor: "var(--turf-dark)", border: "1px solid var(--turf-light)" };

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={card}>
      <p className="text-xs mb-1" style={{ color: "#7a9e86" }}>{label}</p>
      <p className="text-2xl font-extrabold" style={{ color: color ?? "var(--cream)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#4a6e56" }}>{sub}</p>}
    </div>
  );
}

function BarChart({ data }: { data: [string, number][] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {data.map(([label, value]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs w-16 shrink-0 text-right" style={{ color: "#7a9e86" }}>{label}</span>
          <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: "var(--turf-mid)" }}>
            <div
              className="h-full rounded transition-all flex items-center px-2"
              style={{
                width: `${(value / max) * 100}%`,
                background: "linear-gradient(90deg, #1e4a2a, #2d6a40)",
                minWidth: value > 0 ? "2rem" : 0,
              }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
                {value.toLocaleString()}円
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const MODE_LABEL: Record<string, string> = {
  conservative: "堅め", standard: "標準", aggressive: "穴狙い",
};

function StatusBadge({ record }: { record: RoiRecord }) {
  if (!record.has_result) {
    return <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--turf-mid)", color: "#4a6e56" }}>未確定</span>;
  }
  return record.hit ? (
    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: "#14401e", color: "#86efac" }}>的中</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "#3b0e0e", color: "#fca5a5" }}>ハズレ</span>
  );
}

export default function RoiPage() {
  const [data, setData] = useState<RoiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "hit" | "miss">("all");

  useEffect(() => {
    fetchRoi().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-64 rounded-xl animate-pulse" style={card} />;
  }

  if (!data) {
    return <p style={{ color: "#4a6e56" }}>データを取得できませんでした</p>;
  }

  const { summary, by_ticket, by_date, records } = data;

  const filtered = records.filter((r) => {
    if (filter === "hit") return r.hit;
    if (filter === "miss") return r.has_result && !r.hit;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold tracking-wide" style={{ color: "var(--cream)" }}>
          回収率ダッシュボード
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "#7a9e86" }}>
          予想×結果の的中率・投資額を一覧表示
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="総投資額"
          value={`${summary.total_budget.toLocaleString()}円`}
          color="var(--gold)"
        />
        <StatCard
          label="予想数"
          value={summary.prediction_count}
          sub="保存済み"
        />
        <StatCard
          label="結果登録済み"
          value={summary.result_count}
          sub={`未確定 ${summary.prediction_count - summary.result_count}件`}
        />
        <StatCard
          label="的中率"
          value={summary.hit_rate !== null ? `${summary.hit_rate}%` : "—"}
          sub={`${summary.hit_count}/${summary.result_count}的中`}
          color={
            summary.hit_rate === null ? "var(--cream)"
              : summary.hit_rate >= 50 ? "#86efac"
              : summary.hit_rate >= 30 ? "var(--gold)"
              : "#fca5a5"
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 月別投資額グラフ */}
        <div className="rounded-xl p-5" style={card}>
          <h3 className="font-bold text-sm mb-4" style={{ color: "var(--gold)" }}>月別投資額</h3>
          {by_date.length > 0 ? (
            <BarChart data={by_date} />
          ) : (
            <p className="text-sm" style={{ color: "#4a6e56" }}>データなし</p>
          )}
        </div>

        {/* 券種別分析 */}
        <div className="rounded-xl p-5" style={card}>
          <h3 className="font-bold text-sm mb-4" style={{ color: "var(--gold)" }}>券種別分析</h3>
          <div className="space-y-2">
            {Object.entries(by_ticket).length === 0 ? (
              <p className="text-sm" style={{ color: "#4a6e56" }}>データなし</p>
            ) : (
              Object.entries(by_ticket).map(([tt, stat]) => {
                const rate = stat.count > 0 ? Math.round((stat.hits / stat.count) * 100) : 0;
                const label = TICKET_TYPE_LABELS[tt as keyof typeof TICKET_TYPE_LABELS] ?? tt;
                return (
                  <div key={tt} className="flex items-center gap-3">
                    <span className="text-xs w-14 shrink-0" style={{ color: "var(--cream)" }}>{label}</span>
                    <div className="flex-1 h-5 rounded overflow-hidden" style={{ backgroundColor: "var(--turf-mid)" }}>
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${rate}%`,
                          background: rate >= 50 ? "#14401e" : rate >= 30 ? "#3d2a00" : "#3b0e0e",
                          minWidth: stat.hits > 0 ? "1rem" : 0,
                        }}
                      />
                    </div>
                    <span className="text-xs w-20 text-right shrink-0" style={{ color: "#7a9e86" }}>
                      {stat.hits}/{stat.count}件 ({rate}%)
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 予想一覧 */}
      <div className="rounded-xl overflow-hidden" style={card}>
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: "var(--turf-mid)", borderBottom: "1px solid var(--turf-light)" }}
        >
          <h3 className="font-bold text-sm" style={{ color: "var(--gold)" }}>予想一覧</h3>
          <div className="flex gap-1.5">
            {(["all", "hit", "miss"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs px-2.5 py-1 rounded transition-colors"
                style={
                  filter === f
                    ? { backgroundColor: "var(--turf-light)", color: "var(--gold)" }
                    : { color: "#4a6e56" }
                }
              >
                {f === "all" ? "全て" : f === "hit" ? "的中のみ" : "ハズレのみ"}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center" style={{ color: "#4a6e56" }}>
            {records.length === 0 ? (
              <>
                <p>予想がまだ保存されていません</p>
                <Link href="/races" className="text-sm mt-2 inline-block" style={{ color: "var(--gold)" }}>
                  レースを予想する →
                </Link>
              </>
            ) : "該当する予想がありません"}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--turf-light)" }}>
            {filtered.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <StatusBadge record={r} />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/races/${r.race_id}`}
                    className="text-sm font-semibold truncate block hover:underline"
                    style={{ color: "var(--cream)" }}
                  >
                    {r.race_name}
                  </Link>
                  <p className="text-xs" style={{ color: "#7a9e86" }}>
                    {r.race_date} {r.venue} / {TICKET_TYPE_LABELS[r.ticket_type as keyof typeof TICKET_TYPE_LABELS] ?? r.ticket_type} / {MODE_LABEL[r.mode] ?? r.mode}
                    {r.has_result && r.first_place && (
                      <span className="ml-2" style={{ color: "var(--gold)" }}>1着: {r.first_place}</span>
                    )}
                  </p>
                </div>
                <span className="text-sm font-bold shrink-0" style={{ color: "var(--gold)" }}>
                  {r.total_budget.toLocaleString()}円
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-center pb-2" style={{ color: "#4a6e56" }}>
        ※ 的中判定は馬番号の一致による自動判定です。実際の払戻額は含まれません。
      </p>
    </div>
  );
}
