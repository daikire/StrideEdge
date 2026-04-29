"use client";
import { useEffect, useState } from "react";
import { fetchSettings, updateSettings, testNotification } from "@/lib/api";
import { SettingsModel } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEFAULT_SETTINGS: SettingsModel = {
  weight_recent_results: 30,
  weight_odds: 20,
  weight_distance: 15,
  weight_jockey: 15,
  weight_gate: 10,
  weight_manual: 10,
  default_mode: "standard",
  target_min_odds: 2.0,
  target_max_odds: 50.0,
  budget_per_race: 3000,
  enable_notifications: true,
  dark_mode: true,
  notify_mac: true,
  notify_email: false,
  notification_email: "",
  gmail_app_password: "",
  alarm_minutes_before: 30,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsModel>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [shutting, setShutting] = useState(false);
  const [shutdownDone, setShutdownDone] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(() => setSettings(DEFAULT_SETTINGS))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = <K extends keyof SettingsModel>(key: K, value: SettingsModel[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const totalWeight =
    settings.weight_recent_results +
    settings.weight_odds +
    settings.weight_distance +
    settings.weight_jockey +
    settings.weight_gate +
    settings.weight_manual;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateSettings(settings);
      setMessage({ type: "success", text: "設定を保存しました" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">設定</h2>
        <p className="text-slate-400 text-sm mt-1">スコアリングの重みや動作設定を調整できます</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* スコアリング重み */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">スコアリング重み</h3>
            <span className={`text-sm font-medium ${totalWeight === 100 ? "text-green-400" : "text-red-400"}`}>
              合計: {totalWeight} / 100
            </span>
          </div>
          <div className="space-y-4">
            {[
              { key: "weight_recent_results" as const, label: "直近成績", desc: "直近5戦の着順" },
              { key: "weight_odds" as const, label: "オッズ人気", desc: "単勝オッズによる人気度" },
              { key: "weight_distance" as const, label: "距離適性", desc: "距離・馬場適性" },
              { key: "weight_jockey" as const, label: "騎手", desc: "騎手の過去成績" },
              { key: "weight_gate" as const, label: "枠順", desc: "コース・距離に応じた枠の有利不利" },
              { key: "weight_manual" as const, label: "手動補正", desc: "ユーザーによる手動調整枠" },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between mb-1">
                  <div>
                    <span className="text-slate-200 text-sm font-medium">{item.label}</span>
                    <span className="text-slate-500 text-xs ml-2">{item.desc}</span>
                  </div>
                  <span className="text-white font-mono text-sm w-8 text-right">
                    {settings[item.key]}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={settings[item.key] as number}
                  onChange={(e) => handleChange(item.key, parseInt(e.target.value))}
                  className="w-full accent-green-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 対象オッズ設定 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">対象オッズ設定</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-sm block mb-1">最小オッズ</label>
              <input
                type="number"
                min={1.0}
                max={100}
                step={0.5}
                value={settings.target_min_odds}
                onChange={(e) => handleChange("target_min_odds", parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">最大オッズ</label>
              <input
                type="number"
                min={1.0}
                max={999}
                step={1}
                value={settings.target_max_odds}
                onChange={(e) => handleChange("target_max_odds", parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* 予算・モード設定 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">デフォルト設定</h3>
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm block mb-1">1レースあたりの予算 (円)</label>
              <input
                type="number"
                min={500}
                max={100000}
                step={500}
                value={settings.budget_per_race}
                onChange={(e) => handleChange("budget_per_race", parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">デフォルト分析モード</label>
              <select
                value={settings.default_mode}
                onChange={(e) => handleChange("default_mode", e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              >
                <option value="conservative">堅め</option>
                <option value="standard">標準</option>
                <option value="aggressive">穴狙い</option>
              </select>
            </div>
          </div>
        </div>

        {/* ON/OFFトグル */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">ON/OFF 設定</h3>
          <div className="space-y-3">
            {[
              { key: "dark_mode" as const, label: "ダークモード" },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300 text-sm">{item.label}</span>
                <div
                  onClick={() => handleChange(item.key, !settings[item.key])}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings[item.key] ? "bg-green-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settings[item.key] ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* アラーム・通知設定 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
          <h3 className="text-white font-semibold">アラーム・通知設定</h3>

          {/* 通知先 */}
          <div className="space-y-3">
            <p className="text-slate-400 text-xs">通知先（複数選択可）</p>
            {[
              { key: "notify_mac" as const, label: "Mac通知", desc: "画面右上にバナー表示" },
              { key: "notify_email" as const, label: "メール通知", desc: "Gmailへ送信" },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-slate-200 text-sm">{item.label}</span>
                  <span className="text-slate-500 text-xs ml-2">{item.desc}</span>
                </div>
                <div
                  onClick={() => handleChange(item.key, !settings[item.key])}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                    settings[item.key] ? "bg-green-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settings[item.key] ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </div>
              </label>
            ))}
          </div>

          {/* デフォルト発走前通知時間 */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">
              デフォルト通知タイミング（発走何分前）
            </label>
            <select
              value={settings.alarm_minutes_before}
              onChange={(e) => handleChange("alarm_minutes_before", parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            >
              {[10, 15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>{m}分前</option>
              ))}
            </select>
          </div>

          {/* メール設定（メール通知ONの場合のみ表示） */}
          {settings.notify_email && (
            <div className="space-y-3 border-t border-slate-700 pt-4">
              <p className="text-slate-400 text-xs">Gmail設定</p>
              <div>
                <label className="text-slate-400 text-sm block mb-1">送受信メールアドレス</label>
                <input
                  type="email"
                  value={settings.notification_email}
                  onChange={(e) => handleChange("notification_email", e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">
                  Gmailアプリパスワード
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-green-400 text-xs hover:underline"
                  >
                    発行方法 →
                  </a>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={settings.gmail_app_password}
                    onChange={(e) => handleChange("gmail_app_password", e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs hover:text-white px-1"
                  >
                    {showPassword ? "隠す" : "表示"}
                  </button>
                </div>
                <p className="text-slate-600 text-xs mt-1">
                  Googleアカウント → セキュリティ → 2段階認証ON → アプリパスワード で16桁のパスワードを発行
                </p>
              </div>
            </div>
          )}

          {/* テスト通知 */}
          <button
            type="button"
            disabled={testing}
            onClick={async () => {
              setTesting(true);
              try {
                await testNotification();
                setMessage({ type: "success", text: "テスト通知を送信しました" });
              } catch {
                setMessage({ type: "error", text: "テスト通知に失敗しました。設定を確認してください" });
              } finally {
                setTesting(false);
                setTimeout(() => setMessage(null), 4000);
              }
            }}
            className="w-full border border-slate-600 hover:border-green-500 text-slate-300 hover:text-green-400 font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
          >
            {testing ? "送信中..." : "🔔 テスト通知を送る"}
          </button>
        </div>

        {/* 保存ボタン */}
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
          {saving ? "保存中..." : "設定を保存する"}
        </button>
      </form>

      {/* アプリ停止 */}
      <div className="bg-slate-800 border border-red-900/40 rounded-xl p-5 mt-6">
        <h3 className="text-white font-semibold mb-1">アプリを停止する</h3>
        <p className="text-slate-400 text-xs mb-4">
          バックエンドとフロントエンドをすべて停止します。次回はデスクトップの StrideEdge.app から起動してください。
        </p>
        {shutdownDone ? (
          <div className="text-center text-slate-400 text-sm py-2">
            停止しました。このタブを閉じてください。
          </div>
        ) : (
          <button
            type="button"
            disabled={shutting}
            onClick={async () => {
              if (!confirm("StrideEdge を停止しますか？ブラウザのタブも閉じてください。")) return;
              setShutting(true);
              try {
                await fetch(`${API_BASE}/api/shutdown`, { method: "POST" });
              } catch {
                // サーバーが止まるので通信エラーは正常
              }
              setShutdownDone(true);
              setShutting(false);
            }}
            className="w-full bg-red-900/60 hover:bg-red-800 disabled:opacity-50 text-red-300 hover:text-white font-medium py-2.5 rounded-xl transition-colors text-sm border border-red-800/60"
          >
            {shutting ? "停止中..." : "StrideEdge を停止する"}
          </button>
        )}
      </div>
    </div>
  );
}
