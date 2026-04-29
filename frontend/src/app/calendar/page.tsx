"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCalendar, fetchRaceDates, fetchAlarms, createAlarm, deleteAlarm } from "@/lib/api";
import { CalendarRaceDay, AlarmResponse } from "@/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const VENUE_STYLES: Record<string, { bg: string; text: string }> = {
  東京: { bg: "#1e3a5f", text: "#93c5fd" },
  中山: { bg: "#14401e", text: "#86efac" },
  阪神: { bg: "#3d1c0e", text: "#fdba74" },
  京都: { bg: "#2e1a4a", text: "#c4b5fd" },
  小倉: { bg: "#3b0e0e", text: "#fca5a5" },
  新潟: { bg: "#0e3030", text: "#5eead4" },
  中京: { bg: "#3d2e00", text: "#fde68a" },
  福島: { bg: "#3b1030", text: "#f9a8d4" },
};

function VenueBadge({ venue, small = false }: { venue: string; small?: boolean }) {
  const s = VENUE_STYLES[venue] ?? { bg: "#1e293b", text: "#94a3b8" };
  return (
    <span
      className={`rounded font-semibold truncate ${small ? "text-[10px] px-1 py-0.5" : "text-xs px-2 py-0.5"}`}
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {venue}
    </span>
  );
}

interface DayCell {
  date: number | null;
  dateStr: string;
  raceDays: CalendarRaceDay[];
}

export default function CalendarPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [raceDays, setRaceDays] = useState<CalendarRaceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [latestDataYM, setLatestDataYM] = useState<{ year: number; month: number } | null>(null);
  const [alarms, setAlarms] = useState<AlarmResponse[]>([]);
  const [alarmRaceTime, setAlarmRaceTime] = useState("15:30");
  const [alarmMinutes, setAlarmMinutes] = useState(30);
  const [alarmSaving, setAlarmSaving] = useState<string | null>(null);

  // 初回: データのある最新月へ自動移動 + アラーム取得
  useEffect(() => {
    Promise.all([fetchRaceDates(), fetchAlarms()])
      .then(([dates, alarmList]) => {
        if (dates.length > 0) {
          const [y, m] = dates[0].split("-").map(Number);
          setLatestDataYM({ year: y, month: m });
          setYear(y);
          setMonth(m);
        }
        setAlarms(alarmList);
      })
      .finally(() => setInitialized(true));
  }, []);

  // 月変更ごとにカレンダーデータ取得
  useEffect(() => {
    if (!initialized) return;
    setLoading(true);
    fetchCalendar(year, month)
      .then((data) => setRaceDays(data.race_days))
      .catch(() => setRaceDays([]))
      .finally(() => setLoading(false));
  }, [year, month, initialized]);

  const prevMonth = () => {
    setSelectedDate(null);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDate(null);
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };
  const goToLatest = () => {
    if (!latestDataYM) return;
    setYear(latestDataYM.year);
    setMonth(latestDataYM.month);
    setSelectedDate(null);
  };

  // カレンダーグリッド構築
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const raceDayMap: Record<string, CalendarRaceDay[]> = {};
  for (const rd of raceDays) {
    if (!raceDayMap[rd.race_date]) raceDayMap[rd.race_date] = [];
    raceDayMap[rd.race_date].push(rd);
  }

  const cells: DayCell[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ date: null, dateStr: "", raceDays: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date: d, dateStr, raceDays: raceDayMap[dateStr] ?? [] });
  }

  const hasAnyRace = raceDays.length > 0;
  const isCurrentMonthLatest =
    latestDataYM && latestDataYM.year === year && latestDataYM.month === month;
  const selectedRaceDays = selectedDate ? (raceDayMap[selectedDate] ?? []) : [];

  const cardStyle = { backgroundColor: "var(--turf-dark)", border: "1px solid var(--turf-light)" };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ページタイトル */}
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold tracking-wide" style={{ color: "var(--cream)" }}>
          開催カレンダー
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "#7a9e86" }}>
          競馬開催日・競馬場・Win5対象レースを確認
        </p>
      </div>

      {/* 月ナビ */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3" style={cardStyle}>
        <button
          onClick={prevMonth}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "var(--cream)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--turf-mid)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}
        >
          ← 前月
        </button>

        <div className="flex items-center gap-3">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--gold)" }}>
            {year}年 {month}月
          </h3>
          {!isCurrentMonthLatest && latestDataYM && (
            <button
              onClick={goToLatest}
              className="text-[11px] px-2 py-1 rounded-lg transition-colors"
              style={{ backgroundColor: "#1e3d28", color: "#86efac", border: "1px solid #2d6a40" }}
            >
              最新データへ
            </button>
          )}
        </div>

        <button
          onClick={nextMonth}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "var(--cream)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--turf-mid)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}
        >
          翌月 →
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--turf-light)", backgroundColor: "var(--turf-mid)" }}>
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className="text-center py-2 text-xs font-bold"
              style={{ color: i === 0 ? "#f87171" : i === 6 ? "#93c5fd" : "#7a9e86" }}
            >
              {w}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse" style={{ color: "#4a6e56" }}>
            読み込み中...
          </div>
        ) : !hasAnyRace ? (
          <div className="py-16 text-center space-y-3">
            <p style={{ color: "#4a6e56" }}>この月の開催データがありません</p>
            {latestDataYM && (
              <button
                onClick={goToLatest}
                className="text-sm px-4 py-2 rounded-lg"
                style={{ backgroundColor: "var(--turf-light)", color: "var(--gold)" }}
              >
                {latestDataYM.year}年{latestDataYM.month}月（最新データ）へ →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;
              const hasRace = cell.raceDays.length > 0;
              const hasWin5 = cell.raceDays.some((rd) => rd.is_win5 === 1);
              const weekday = idx % 7;

              return (
                <div
                  key={idx}
                  onClick={() => hasRace && setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr)}
                  className="min-h-[80px] p-1.5 transition-colors"
                  style={{
                    borderRight: "1px solid var(--turf-light)",
                    borderBottom: "1px solid var(--turf-light)",
                    backgroundColor: !cell.date
                      ? "rgba(0,0,0,0.2)"
                      : isSelected
                      ? "var(--turf-mid)"
                      : undefined,
                    cursor: hasRace ? "pointer" : "default",
                    outline: isSelected ? "1px solid var(--gold)" : undefined,
                    outlineOffset: "-1px",
                  }}
                  onMouseEnter={e => { if (hasRace && !isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--turf-mid)"; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                >
                  {cell.date && (
                    <>
                      {/* 日付行 */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full"
                          style={{
                            backgroundColor: isToday ? "#16a34a" : "transparent",
                            color: isToday ? "#fff" : weekday === 0 ? "#f87171" : weekday === 6 ? "#93c5fd" : "var(--cream)",
                          }}
                        >
                          {cell.date}
                        </span>
                        {hasWin5 && (
                          <span
                            className="text-[9px] px-1 rounded font-bold"
                            style={{ backgroundColor: "#3d2a00", color: "var(--gold)" }}
                          >
                            W5
                          </span>
                        )}
                      </div>

                      {/* 競馬場バッジ */}
                      <div className="flex flex-col gap-0.5">
                        {cell.raceDays.map((rd, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-0.5"
                          >
                            <VenueBadge venue={rd.venue} small />
                            <span className="text-[9px]" style={{ color: "#4a6e56" }}>
                              {rd.race_count}R
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-3 flex-wrap px-1">
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold"
            style={{ backgroundColor: "#3d2a00", color: "var(--gold)" }}
          >W5</span>
          <span className="text-xs" style={{ color: "#7a9e86" }}>Win5対象</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: "#16a34a" }} />
          <span className="text-xs" style={{ color: "#7a9e86" }}>今日</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(VENUE_STYLES).map(([venue]) => (
            <VenueBadge key={venue} venue={venue} />
          ))}
        </div>
      </div>

      {/* 選択日の詳細パネル */}
      {selectedDate && (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: "var(--turf-mid)", borderBottom: "1px solid var(--turf-light)" }}
          >
            <h4 className="font-bold text-sm" style={{ color: "var(--cream)" }}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", {
                year: "numeric", month: "long", day: "numeric", weekday: "short",
              })}
            </h4>
            <button
              onClick={() => setSelectedDate(null)}
              style={{ color: "#4a6e56" }}
              className="hover:opacity-80 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="p-4 space-y-4">
            {selectedRaceDays.map((rd, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <VenueBadge venue={rd.venue} />
                  {rd.is_win5 === 1 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: "#3d2a00", color: "var(--gold)" }}>
                      Win5対象
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "#7a9e86" }}>{rd.race_count}レース</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rd.race_ids.map((raceId, j) => {
                    const existingAlarm = alarms.find((a) => a.race_id === raceId && !a.fired);
                    return (
                      <div key={raceId} className="flex items-center gap-1">
                        <Link
                          href={`/races/${raceId}`}
                          className="text-xs px-2.5 py-1 rounded-lg transition-colors truncate max-w-[180px]"
                          style={{ backgroundColor: "var(--turf-mid)", color: "var(--cream)", border: "1px solid var(--turf-light)" }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--gold)")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--turf-light)")}
                        >
                          {rd.race_names[j] ?? raceId}
                        </Link>
                        {existingAlarm ? (
                          <button
                            title={`アラーム解除（${existingAlarm.race_time} の${existingAlarm.minutes_before}分前）`}
                            onClick={async () => {
                              await deleteAlarm(existingAlarm.id);
                              setAlarms((prev) => prev.filter((a) => a.id !== existingAlarm.id));
                            }}
                            className="text-xs px-1.5 py-1 rounded transition-colors"
                            style={{ backgroundColor: "#3d2a00", color: "var(--gold)" }}
                          >
                            🔔
                          </button>
                        ) : (
                          <button
                            title="アラームをセット"
                            disabled={alarmSaving === raceId}
                            onClick={async () => {
                              setAlarmSaving(raceId);
                              try {
                                const a = await createAlarm({
                                  race_id: raceId,
                                  race_name: rd.race_names[j] ?? raceId,
                                  race_date: selectedDate!,
                                  race_time: alarmRaceTime,
                                  minutes_before: alarmMinutes,
                                  notify_mac: true,
                                  notify_email: false,
                                });
                                setAlarms((prev) => [...prev, a]);
                              } finally {
                                setAlarmSaving(null);
                              }
                            }}
                            className="text-xs px-1.5 py-1 rounded transition-colors"
                            style={{ backgroundColor: "var(--turf-mid)", color: "#4a6e56", border: "1px solid var(--turf-light)" }}
                          >
                            🔕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* アラーム設定 */}
            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "var(--turf-mid)", border: "1px solid var(--turf-light)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--gold)" }}>アラーム設定</p>
              <div className="flex gap-2 flex-wrap">
                <div>
                  <p className="text-xs mb-1" style={{ color: "#7a9e86" }}>発走時刻</p>
                  <input
                    type="time"
                    value={alarmRaceTime}
                    onChange={(e) => setAlarmRaceTime(e.target.value)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: "var(--turf-dark)", color: "var(--cream)", border: "1px solid var(--turf-light)" }}
                  />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "#7a9e86" }}>何分前に通知</p>
                  <select
                    value={alarmMinutes}
                    onChange={(e) => setAlarmMinutes(Number(e.target.value))}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: "var(--turf-dark)", color: "var(--cream)", border: "1px solid var(--turf-light)" }}
                  >
                    {[10, 15, 20, 30, 45, 60].map((m) => (
                      <option key={m} value={m}>{m}分前</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs" style={{ color: "#4a6e56" }}>
                🔕 = 未設定　🔔 = 設定済み（タップで解除）
              </p>
            </div>

            <Link
              href={`/predictions?date=${selectedDate}`}
              className="inline-block text-sm font-bold px-4 py-2 rounded-lg transition-opacity"
              style={{ backgroundColor: "var(--gold)", color: "#0d1f12" }}
            >
              この日の予想を見る →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
