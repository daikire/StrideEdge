"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/":            "ダッシュボード",
  "/predictions": "予想一覧",
  "/races":       "レース一覧",
  "/calendar":    "開催カレンダー",
  "/history":     "過去履歴",
  "/results":     "結果登録",
  "/settings":    "設定",
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes("/tickets")) return "券種別提案";
  if (pathname.startsWith("/races/")) return "レース分析";
  return "StrideEdge";
}

export default function Header() {
  const pathname = usePathname();
  const title = getTitle(pathname);
  const [stopping, setStopping] = useState(false);
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  async function handleStop() {
    if (!confirm("StrideEdge を終了しますか？\nブラウザタブも閉じてください。")) return;
    setStopping(true);
    try {
      await fetch("http://localhost:8000/api/shutdown", { method: "POST" });
    } catch {
      // shutdown kills the server, so fetch may throw — that's expected
    }
    window.close();
  }

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10"
      style={{
        backgroundColor: "var(--turf-dark)",
        borderBottom: "1px solid var(--turf-light)",
        backgroundImage: "linear-gradient(180deg, var(--turf-mid) 0%, var(--turf-dark) 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="md:hidden text-base font-black tracking-wider"
          style={{ color: "var(--gold)" }}
        >
          StrideEdge
        </span>
        <h1
          className="font-bold text-base md:text-lg tracking-wide"
          style={{ color: "var(--cream)" }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs hidden sm:block" style={{ color: "#7a9e86" }}>{today}</span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
            title="バックエンド接続中"
          />
          <span className="text-xs hidden md:block" style={{ color: "#7a9e86" }}>接続中</span>
        </div>
        <button
          onClick={handleStop}
          disabled={stopping}
          title="アプリを終了"
          style={{
            background: "none",
            border: "1px solid #7a3a3a",
            borderRadius: "4px",
            color: stopping ? "#666" : "#e07070",
            cursor: stopping ? "not-allowed" : "pointer",
            fontSize: "11px",
            padding: "2px 8px",
            lineHeight: "1.6",
          }}
        >
          {stopping ? "停止中..." : "終了"}
        </button>
      </div>
    </header>
  );
}
