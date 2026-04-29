"use client";
import { useEffect, useState, useMemo } from "react";
import { fetchRaceDates, fetchRaces } from "@/lib/api";
import { RaceInfo } from "@/types";
import RaceCard from "@/components/Race/RaceCard";

const panel = { background: "var(--bg-panel)", border: "1px solid var(--border)" } as const;

export default function RacesPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [races, setRaces] = useState<RaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [win5Only, setWin5Only] = useState(false);

  // 日付リスト取得（マウント時1回のみ）
  useEffect(() => {
    let cancelled = false;
    async function loadDates() {
      try {
        const d = await fetchRaceDates();
        if (cancelled) return;
        setDates(d);
        if (d.length > 0) setSelectedDate(d[0]);
      } catch {
        if (!cancelled) {
          setError("日付リストの取得に失敗しました");
          setLoading(false);
        }
      }
    }
    loadDates();
    return () => { cancelled = true; };
  }, []);

  // selectedDate 変更ごとにレース取得。AbortController で競合防止
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    setRaces([]);

    const controller = new AbortController();

    fetchRaces(selectedDate)
      .then((data) => {
        if (controller.signal.aborted) return;
        setRaces(data);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError("レース情報の取得に失敗しました");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [selectedDate]);

  const displayedRaces = useMemo(
    () => (win5Only ? races.filter((r) => r.is_win5) : races),
    [races, win5Only]
  );

  const win5Count = useMemo(() => races.filter((r) => r.is_win5).length, [races]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric", weekday: "short",
    });

  return (
    <div className="space-y-4">
      {/* header */}
      <div>
        <p className="term-label">RACE LIST</p>
        <h2
          className="text-lg font-semibold mt-0.5"
          style={{ color: "var(--text-primary)", fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          開催レース一覧
        </h2>
      </div>

      {error && (
        <div
          className="rounded px-4 py-2 text-xs"
          style={{ background: "#1a0505", border: "1px solid var(--negative)", color: "var(--negative)", fontFamily: "'DM Mono', monospace" }}
        >
          {error}
        </div>
      )}

      {/* date selector */}
      {dates.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className="px-3 py-1.5 rounded text-[10px] tracking-wider transition-all"
              style={{
                fontFamily: "'DM Mono', monospace",
                background: selectedDate === d ? "var(--bg-elevated)" : "var(--bg-panel)",
                color: selectedDate === d ? "var(--gold)" : "var(--text-secondary)",
                border: `1px solid ${selectedDate === d ? "var(--gold-dim)" : "var(--border)"}`,
              }}
            >
              {formatDate(d)}
            </button>
          ))}
        </div>
      )}

      {/* filter bar */}
      {!loading && races.length > 0 && (
        <div className="flex items-center gap-2">
          <p className="term-label mr-1">FILTER:</p>
          {[
            { label: "ALL", active: !win5Only, onClick: () => setWin5Only(false) },
            { label: `WIN5 (${win5Count})`, active: win5Only, onClick: () => setWin5Only(true) },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className="px-3 py-1 rounded text-[10px] tracking-wider transition-all"
              style={{
                fontFamily: "'DM Mono', monospace",
                background: btn.active ? "var(--bg-elevated)" : "var(--bg-panel)",
                color: btn.active ? "var(--gold)" : "var(--text-secondary)",
                border: `1px solid ${btn.active ? "var(--gold-dim)" : "var(--border)"}`,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* race list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded p-4 animate-pulse h-24"
              style={{ background: "var(--bg-panel)" }}
            />
          ))}
        </div>
      ) : displayedRaces.length === 0 ? (
        <div
          className="rounded px-4 py-12 text-center"
          style={panel}
        >
          <p
            className="text-xs tracking-widest"
            style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
          >
            {win5Only ? "WIN5 RACES NOT FOUND" : "NO RACES FOR THIS DATE"}
          </p>
          {win5Only && (
            <button
              onClick={() => setWin5Only(false)}
              className="mt-3 text-[10px] tracking-widest"
              style={{ color: "var(--positive)", fontFamily: "'DM Mono', monospace" }}
            >
              SHOW ALL →
            </button>
          )}
        </div>
      ) : (
        <>
          <p
            className="text-[10px] tracking-widest"
            style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
          >
            {selectedDate && formatDate(selectedDate)} — {win5Only ? `WIN5 ${displayedRaces.length}` : `${races.length} RACES`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedRaces.map((race) => (
              <RaceCard key={race.race_id} race={race} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
