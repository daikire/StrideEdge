import { DataStatus as DataStatusType } from "@/types";

interface Props {
  status: DataStatusType;
}

const STATUS_CONFIG = {
  ok: { icon: "✅", color: "text-green-400", bg: "bg-green-900/20 border-green-700/40" },
  warning: { icon: "⚠️", color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-700/40" },
  error: { icon: "❌", color: "text-red-400", bg: "bg-red-900/20 border-red-700/40" },
};

export default function DataStatus({ status }: Props) {
  const config = STATUS_CONFIG[status.status] ?? STATUS_CONFIG.error;
  return (
    <div className={`border rounded-lg p-3 ${config.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{config.icon}</span>
        <span className={`font-semibold text-sm ${config.color}`}>{status.source_name}</span>
        <span className="ml-auto text-slate-500 text-xs">
          {status.record_count > 0 ? `${status.record_count}件` : ""}
        </span>
      </div>
      {status.message && (
        <p className="text-slate-400 text-xs">{status.message}</p>
      )}
      {status.last_updated && (
        <p className="text-slate-500 text-xs mt-1">更新: {status.last_updated}</p>
      )}
    </div>
  );
}
