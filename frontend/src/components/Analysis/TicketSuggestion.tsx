import { TicketSuggestion as TicketSuggestionType, TICKET_TYPE_LABELS } from "@/types";

interface Props {
  suggestion: TicketSuggestionType;
}

export default function TicketSuggestionCard({ suggestion }: Props) {
  const label = TICKET_TYPE_LABELS[suggestion.ticket_type] ?? suggestion.ticket_type;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-green-800 text-green-300 text-xs font-bold px-2 py-0.5 rounded">
            {label}
          </span>
          <span className="text-slate-300 text-sm">{suggestion.summary}</span>
        </div>
        <span className="text-white font-semibold">
          合計 {suggestion.total_budget.toLocaleString()}円
        </span>
      </div>

      <div className="space-y-2">
        {suggestion.candidates.length === 0 ? (
          <p className="text-slate-500 text-sm">候補なし</p>
        ) : (
          suggestion.candidates.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-white font-mono font-semibold">{c.label}</span>
                <div className="flex gap-1">
                  {c.horse_numbers.map((n) => (
                    <span
                      key={n}
                      className="w-6 h-6 rounded-full bg-green-700 text-white text-xs flex items-center justify-center font-bold"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {c.expected_return && (
                  <span className="text-yellow-400">
                    払戻予想 {c.expected_return.toLocaleString()}円
                  </span>
                )}
                <span className="text-slate-300">{c.amount.toLocaleString()}円</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
