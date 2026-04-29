"use client";
import { OverhypedHorse } from "@/types";

interface Props {
  horses: OverhypedHorse[];
}

export default function OverhypedAlert({ horses }: Props) {
  if (horses.length === 0) return null;

  return (
    <div
      className="rounded px-3 py-2.5"
      style={{ background: "#1a0808", border: "1px solid #6a1515" }}
    >
      <p
        className="term-label mb-2"
        style={{ color: "#e07070", fontFamily: "'DM Mono', monospace" }}
      >
        OVERHYPED DETECTOR — {horses.length}頭 検知
      </p>
      <div className="space-y-1.5">
        {horses.map((h) => (
          <div key={h.horse_id} className="flex items-start gap-2">
            <span
              className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-sm tabular-nums"
              style={{
                background: "#2a0808",
                border: "1px solid #6a1515",
                color: "#e07070",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {h.horse_number}番
            </span>
            <div className="min-w-0">
              <span
                className="text-xs font-medium"
                style={{ color: "#f0a0a0" }}
              >
                {h.horse_name}
              </span>
              <p
                className="text-[10px] mt-0.5 leading-snug"
                style={{ color: "#8a4040", fontFamily: "'DM Mono', monospace" }}
              >
                {h.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
