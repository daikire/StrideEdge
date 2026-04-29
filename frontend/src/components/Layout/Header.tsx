"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

const PAGE_TITLES: Record<string, string> = {
  "/":            "DASHBOARD",
  "/edge":        "TODAY'S EDGE",
  "/predictions": "SIGNALS",
  "/races":       "RACES",
  "/calendar":    "CALENDAR",
  "/history":     "HISTORY",
  "/results":     "RECORD",
  "/settings":    "CONFIG",
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes("/tickets")) return "TICKET ANALYSIS";
  if (pathname.startsWith("/races/")) return "RACE ANALYSIS";
  return "TERMINAL";
}

export default function Header() {
  const pathname = usePathname();
  const title = getTitle(pathname);
  const [stopping, setStopping] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "loading">("loading");

  const now = new Date();
  const dateStr = now.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
  const timeStr = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

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
    if (!confirm("StrideEdge Investment Terminal を終了しますか？")) return;
    setStopping(true);
    try {
      await fetch(`${API_BASE}/api/shutdown`, { method: "POST" });
    } catch {
      // shutdown kills the server, fetch may throw — expected
    }
    setStopped(true);
  }

  const statusColor = apiStatus === "ok" ? "var(--positive)" : apiStatus === "error" ? "var(--negative)" : "var(--warn)";
  const statusLabel = apiStatus === "ok" ? "ONLINE" : apiStatus === "error" ? "OFFLINE" : "CONNECTING";

  if (stopped) {
    return (
      <header
        className="h-10 flex items-center justify-center px-4 sticky top-0 z-10"
        style={{ backgroundColor: "var(--bg-panel)", borderBottom: "1px solid var(--border)" }}
      >
        <p
          className="text-xs tracking-widest"
          style={{ color: "var(--positive)", fontFamily: "'DM Mono', monospace" }}
        >
          SYSTEM STOPPED — SAFE TO CLOSE
        </p>
      </header>
    );
  }

  return (
    <header
      className="h-10 flex items-center justify-between px-4 md:px-5 sticky top-0 z-10"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="md:hidden text-xs font-semibold tracking-widest"
          style={{ color: "var(--gold)", fontFamily: "'DM Mono', monospace" }}
        >
          SE
        </span>
        <h1
          className="text-xs font-semibold tracking-widest"
          style={{ color: "var(--text-primary)", fontFamily: "'DM Mono', monospace" }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <span
          className="text-[10px] hidden sm:block tracking-widest tabular-nums"
          style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
        >
          {dateStr} {timeStr}
        </span>

        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${apiStatus === "loading" ? "animate-pulse" : ""}`}
            style={{ backgroundColor: statusColor, boxShadow: apiStatus === "ok" ? `0 0 5px ${statusColor}` : undefined }}
            title={statusLabel}
          />
          <span
            className="text-[10px] hidden md:block tracking-widest"
            style={{ color: statusColor, fontFamily: "'DM Mono', monospace" }}
          >
            {statusLabel}
          </span>
        </div>

        <button
          onClick={handleStop}
          disabled={stopping}
          style={{
            background: "none",
            border: "1px solid var(--border-bright)",
            borderRadius: "2px",
            color: stopping ? "var(--text-dim)" : "var(--negative)",
            cursor: stopping ? "not-allowed" : "pointer",
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.1em",
            padding: "2px 7px",
          }}
        >
          {stopping ? "STOPPING" : "STOP"}
        </button>
      </div>
    </header>
  );
}
