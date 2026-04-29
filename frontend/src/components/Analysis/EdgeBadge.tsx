"use client";
import { PassOrPlayLabel } from "@/types";

const CONFIG: Record<PassOrPlayLabel, { color: string; bg: string; border: string; glow?: string }> = {
  PLAY:    { color: "var(--positive)", bg: "#051a10", border: "#00804a", glow: "0 0 8px #00c97a44" },
  WATCH:   { color: "var(--warn)",     bg: "#1a1205", border: "#8a6010" },
  CAUTION: { color: "#f87171",         bg: "#1a0808", border: "#8a2020" },
  PASS:    { color: "var(--text-dim)", bg: "var(--bg-panel)", border: "var(--border)" },
};

interface Props {
  label: PassOrPlayLabel;
  reason?: string;
  size?: "sm" | "md" | "lg";
}

export default function EdgeBadge({ label, reason, size = "md" }: Props) {
  const c = CONFIG[label];
  const padX = size === "lg" ? "12px" : size === "sm" ? "6px" : "8px";
  const padY = size === "lg" ? "5px" : size === "sm" ? "2px" : "3px";
  const fontSize = size === "lg" ? "12px" : size === "sm" ? "9px" : "10px";

  return (
    <div className="flex flex-col gap-1">
      <span
        className="inline-flex items-center tracking-widest font-medium rounded-sm"
        style={{
          color: c.color,
          background: c.bg,
          border: `1px solid ${c.border}`,
          boxShadow: c.glow,
          fontFamily: "'DM Mono', monospace",
          fontSize,
          padding: `${padY} ${padX}`,
        }}
      >
        {label}
      </span>
      {reason && (
        <p
          className="text-[10px] leading-snug"
          style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}
        >
          {reason}
        </p>
      )}
    </div>
  );
}
