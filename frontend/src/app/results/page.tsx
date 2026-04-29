"use client";
import { useEffect, useState } from "react";
import { fetchRaceDates, fetchRaces, saveResult } from "@/lib/api";
import { RaceInfo } from "@/types";

export default function ResultsPage() {
  const [races, setRaces] = useState<RaceInfo[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string>("");
  const [form, setForm] = useState({
    first_place: "",
    second_place: "",
    third_place: "",
    fourth_place: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingRaces, setLoadingRaces] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const dates = await fetchRaceDates();
        const allRaces: RaceInfo[] = [];
        for (const d of dates) {
          const list = await fetchRaces(d);
          allRaces.push(...list);
        }
        setRaces(allRaces);
        if (allRaces.length > 0) setSelectedRaceId(allRaces[0].race_id);
      } catch {
        // エラー時は空のまま
      } finally {
        setLoadingRaces(false);
      }
    }
    load();
  }, []);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRaceId || !form.first_place || !form.second_place || !form.third_place) {
      setMessage({ type: "error", text: "レース・1着・2着・3着は必須です" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveResult({
        race_id: selectedRaceId,
        first_place: form.first_place,
        second_place: form.second_place,
        third_place: form.third_place,
        fourth_place: form.fourth_place || undefined,
      });
      setMessage({ type: "success", text: "結果を登録しました" });
      setForm({ first_place: "", second_place: "", third_place: "", fourth_place: "" });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "登録に失敗しました";
      setMessage({ type: "error", text: errMsg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">結果登録</h2>
        <p className="text-slate-400 text-sm mt-1">
          レースが終わったら着順を入力してください
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* レース選択 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            レース選択 <span className="text-red-400">*</span>
          </label>
          {loadingRaces ? (
            <div className="h-10 bg-slate-700 rounded-lg animate-pulse" />
          ) : (
            <select
              value={selectedRaceId}
              onChange={(e) => setSelectedRaceId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
            >
              {races.map((r) => (
                <option key={r.race_id} value={r.race_id}>
                  {r.race_date} {r.venue} R{r.race_number} {r.race_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 着順入力 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold">着順入力</h3>
          <p className="text-slate-500 text-xs">馬番号または馬名を入力してください</p>

          {[
            { label: "1着", key: "first_place" as const, required: true, color: "text-yellow-400" },
            { label: "2着", key: "second_place" as const, required: true, color: "text-slate-300" },
            { label: "3着", key: "third_place" as const, required: true, color: "text-amber-600" },
            { label: "4着", key: "fourth_place" as const, required: false, color: "text-slate-500" },
          ].map((f) => (
            <div key={f.key} className="flex items-center gap-4">
              <label className={`w-8 font-bold text-lg ${f.color} shrink-0`}>
                {f.label}
              </label>
              <input
                type="text"
                value={form[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                placeholder={`${f.label}の馬番 / 馬名${f.required ? "" : "（任意）"}`}
                required={f.required}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500"
              />
            </div>
          ))}
        </div>

        {/* メッセージ */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-900/20 border border-green-700/40 text-green-300"
                : "bg-red-900/20 border border-red-700/40 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-700 hover:bg-green-600 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? "登録中..." : "結果を登録する"}
        </button>
      </form>
    </div>
  );
}
