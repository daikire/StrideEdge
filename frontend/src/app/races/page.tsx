"use client";
import { useEffect, useState, useMemo } from "react";
import { fetchRaceDates, fetchRaces } from "@/lib/api";
import { RaceInfo } from "@/types";
import RaceCard from "@/components/Race/RaceCard";

export default function RacesPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [races, setRaces] = useState<RaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [win5Only, setWin5Only] = useState(false);

  useEffect(() => {
    async function loadDates() {
      try {
        const d = await fetchRaceDates();
        setDates(d);
        if (d.length > 0) {
          setSelectedDate(d[0]);
        }
      } catch {
        setError("データの取得に失敗しました");
        setLoading(false);
      }
    }
    loadDates();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetchRaces(selectedDate)
      .then(setRaces)
      .catch(() => setError("レース情報の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const displayedRaces = useMemo(
    () => (win5Only ? races.filter((r) => r.is_win5) : races),
    [races, win5Only]
  );

  const win5Count = useMemo(() => races.filter((r) => r.is_win5).length, [races]);

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">レース一覧</h2>
        <p className="text-slate-400 text-sm mt-1">開催日を選択してレースを確認してください</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 日付タブ */}
      {dates.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDate === d
                  ? "bg-green-700 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              {formatDate(d)}
            </button>
          ))}
        </div>
      )}

      {/* フィルターバー */}
      {!loading && races.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWin5Only(false)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !win5Only
                ? "bg-green-700 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            全レース
          </button>
          <button
            onClick={() => setWin5Only(true)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              win5Only
                ? "bg-purple-700 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            <span className="text-xs font-bold">WIN5</span>
            {win5Count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                win5Only ? "bg-purple-900 text-purple-200" : "bg-purple-700 text-white"
              }`}>
                {win5Count}
              </span>
            )}
          </button>
        </div>
      )}

      {/* レース一覧 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : displayedRaces.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 text-lg">
            {win5Only ? "WIN5対象レースがありません" : "この日のレース情報がありません"}
          </p>
          {win5Only && (
            <button
              onClick={() => setWin5Only(false)}
              className="text-green-400 hover:underline mt-2 text-sm"
            >
              全レースを表示
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-slate-400 text-sm">
            {selectedDate && formatDate(selectedDate)} —{" "}
            {win5Only ? `WIN5 ${displayedRaces.length} レース` : `${races.length} レース`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedRaces.map((race) => (
              <RaceCard key={race.race_id} race={race} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
