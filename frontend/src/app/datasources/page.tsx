"use client";
import { useEffect, useState, useCallback } from "react";
import { fetchSyncLogs, triggerSync, fetchRaceDates, SyncLog, SyncResult } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getNearestRaceDay(): string {
  const today = new Date();
  const day = today.getDay(); // 0=日, 6=土
  if (day === 0 || day === 6) return today.toISOString().slice(0, 10);
  const daysUntilSat = 6 - day;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntilSat);
  return next.toISOString().slice(0, 10);
}

function statusColor(status: string): string {
  switch (status) {
    case "success":       return "text-green-400";
    case "partial":       return "text-yellow-400";
    case "error":         return "text-red-400";
    case "block_detected":return "text-red-400";
    case "running":       return "text-blue-400";
    default:              return "text-slate-400";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "success":       return "✅ 成功";
    case "partial":       return "⚠️ 部分成功";
    case "error":         return "❌ エラー";
    case "block_detected":return "🚫 ブロック検知";
    case "running":       return "⏳ 実行中...";
    default:              return status;
  }
}

export default function DataSourcesPage() {
  const [apiHealth, setApiHealth]     = useState<"ok" | "error" | "loading">("loading");
  const [raceDateCount, setRaceDateCount] = useState<number | null>(null);
  const [syncLogs, setSyncLogs]       = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [syncDate, setSyncDate]       = useState(getNearestRaceDay());
  const [syncing, setSyncing]         = useState(false);
  const [lastResult, setLastResult]   = useState<SyncResult | null>(null);
  const [lastResultDate, setLastResultDate] = useState<string>("");

  const loadLogs = useCallback(async () => {
    try {
      const logs = await fetchSyncLogs(30);
      setSyncLogs(logs);
    } catch {
      setSyncLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => setApiHealth(r.ok ? "ok" : "error"))
      .catch(() => setApiHealth("error"));

    fetchRaceDates()
      .then((dates) => setRaceDateCount(dates.length))
      .catch(() => {});

    loadLogs();
  }, [loadLogs]);

  const handleSync = async () => {
    setSyncing(true);
    setLastResult(null);
    try {
      const result = await triggerSync(syncDate);
      setLastResult(result);
      setLastResultDate(syncDate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "通信エラーが発生しました";
      const isConflict = msg.includes("409");
      setLastResult({
        status: isConflict ? "conflict" : "error",
        races_fetched: 0,
        entries_fetched: 0,
        errors: [isConflict ? "同期が既に実行中です。完了後に再試行してください" : msg],
      });
      setLastResultDate(syncDate);
    } finally {
      setSyncing(false);
      await loadLogs();
    }
  };

  const latestLog = syncLogs[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">データソース</h2>
        <p className="text-slate-400 text-sm mt-1">
          netkeiba からの実データ取得状況を確認・管理します
        </p>
      </div>

      {/* バックエンド接続状態 */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">バックエンドAPI</h3>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            apiHealth === "ok"      ? "bg-green-500" :
            apiHealth === "error"   ? "bg-red-500" :
                                      "bg-yellow-500 animate-pulse"
          }`} />
          <span className="text-slate-300 text-sm">
            {apiHealth === "ok"    ? "接続中 — http://localhost:8000" :
             apiHealth === "error" ? "接続失敗 — バックエンドが起動しているか確認してください" :
                                     "確認中..."}
          </span>
        </div>

        {raceDateCount !== null && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-slate-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{raceDateCount}</p>
              <p className="text-slate-400 text-xs mt-1">DB内の開催日数</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${latestLog ? statusColor(latestLog.status) : "text-slate-400"}`}>
                {latestLog ? statusLabel(latestLog.status) : "—"}
              </p>
              <p className="text-slate-400 text-xs mt-1">最終同期ステータス</p>
            </div>
          </div>
        )}
      </div>

      {/* 手動データ取得 */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-1">手動データ取得</h3>
        <p className="text-slate-400 text-xs mb-4">
          指定日のレース情報・出走表を netkeiba から取得し DB に保存します。
          リクエスト間に 1〜3 秒の待機があるため完了まで数分かかります。
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={syncDate}
            onChange={(e) => setSyncDate(e.target.value)}
            className="bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          />
          <button
            onClick={handleSync}
            disabled={syncing || apiHealth !== "ok"}
            className="px-5 py-2 bg-green-700 hover:bg-green-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {syncing ? "⏳ 取得中..." : "データを取得する"}
          </button>
          {syncing && (
            <span className="text-slate-400 text-xs animate-pulse">
              netkeiba へアクセス中（1〜3秒間隔）...
            </span>
          )}
        </div>

        {/* 直前の実行結果 */}
        {lastResult && (
          <div className={`mt-4 p-4 rounded-lg border text-sm ${
            lastResult.status === "success"        ? "bg-green-900/20 border-green-700/40" :
            lastResult.status === "partial"        ? "bg-yellow-900/20 border-yellow-700/40" :
                                                     "bg-red-900/20 border-red-700/40"
          }`}>
            <p className={`font-semibold ${statusColor(lastResult.status)}`}>
              {statusLabel(lastResult.status)}
              {lastResultDate && (
                <span className="text-slate-400 font-normal ml-2 text-xs">
                  ({lastResultDate})
                </span>
              )}
            </p>
            <p className="text-slate-300 mt-2">
              レース: <span className="text-white font-bold">{lastResult.races_fetched}</span> 件
              エントリー: <span className="text-white font-bold">{lastResult.entries_fetched}</span> 件
            </p>
            {lastResult.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-slate-400 text-xs">エラー詳細:</p>
                {lastResult.errors.map((e, i) => (
                  <p key={i} className="text-red-400 text-xs font-mono break-all">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 取得履歴テーブル */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">取得履歴</h3>
          <button
            onClick={loadLogs}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ↻ 更新
          </button>
        </div>

        {logsLoading ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : syncLogs.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400 text-sm">
            取得履歴がありません。上のボタンからデータ取得を実行してください。
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs">
                  <th className="px-4 py-3 text-left">対象日</th>
                  <th className="px-4 py-3 text-left">ステータス</th>
                  <th className="px-4 py-3 text-right">レース</th>
                  <th className="px-4 py-3 text-right">エントリー</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">実行日時</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">エラー</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 text-white font-mono text-xs">{log.target_date}</td>
                    <td className={`px-4 py-3 font-medium text-xs ${statusColor(log.status)}`}>
                      {statusLabel(log.status)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{log.races_fetched}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{log.entries_fetched}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                      {new Date(log.scraped_at).toLocaleString("ja-JP", {
                        month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-red-400 text-xs hidden lg:table-cell max-w-xs truncate">
                      {log.error_message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 注意事項 */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-2">注意事項</h3>
        <ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
          <li>データ取得は netkeiba へのアクセスを伴います。リクエスト間に 1〜3 秒の間隔を設けています</li>
          <li>短時間での連続実行は控えてください。1日1〜2 回程度を目安にしてください</li>
          <li>取得失敗時でも既存のサンプルデータでアプリは継続動作します</li>
          <li>本アプリは競馬予想の参考情報提供を目的としており、利益を保証するものではありません</li>
        </ul>
      </div>
    </div>
  );
}
