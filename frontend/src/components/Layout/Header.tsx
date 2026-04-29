"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

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
  const [stopped, setStopped] = useState(false);
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "loading">("loading");
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  useEffect(() => {
    const check = () => {
      fetch(`${API_BASE}/health`)
        .then((r) => setApiStatus(r.ok ? "ok" : "error"))
        .catch(() => setApiStatus("error"));
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  async function handleStop() {
    if (!confirm("StrideEdge を終了しますか？")) return;
    setStopping(true);
    try {
      await fetch(`${API_BASE}/api/shutdown`, { method: "POST" });
    } catch {
      // shutdown kills the server, so fetch may throw — that's expected
    }
    setStopped(true);
  }

  if (stopped) {
    return (
      <header
        className="h-14 flex items-center justify-center px-4 sticky top-0 z-10"
        style={{
          backgroundColor: "var(--turf-dark)",
          borderBottom: "1px solid var(--turf-light)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--cream)" }}>
          ✅ 安全に停止しました。このタブを閉じてください。
        </p>
      </header>
    );
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
            className={`w-2 h-2 rounded-full ${apiStatus === "loading" ? "animate-pulse" : ""}`}
            style={{
              backgroundColor: apiStatus === "ok" ? "#22c55e" : apiStatus === "error" ? "#ef4444" : "#f59e0b",
              boxShadow: apiStatus === "ok" ? "0 0 6px #22c55e" : undefined,
            }}
            title={apiStatus === "ok" ? "バックエンド接続中" : apiStatus === "error" ? "バックエンド未接続" : "確認中"}
          />
          <span className="text-xs hidden md:block" style={{ color: "#7a9e86" }}>
            {apiStatus === "ok" ? "接続中" : apiStatus === "error" ? "未接続" : "確認中"}
          </span>
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
