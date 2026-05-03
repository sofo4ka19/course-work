import type { Completion } from "@/types";
import { localDateStr } from "@/utils/date";

interface Props {
  completions: Completion[];
  streakThreshold: number;
  days?: number;
}

export default function HeatMap({ completions, streakThreshold, days: dayCount = 90 }: Props) {
  // Будуємо карту дата → pct для швидкого пошуку
  const pctByDate: Record<string, number> = {};
  completions.forEach((c) => {
    pctByDate[c.completionDate] = c.completionPct;
  });

  // Генеруємо dayCount днів назад
  const days: { date: string; pct: number | null }[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDateStr(d);
    days.push({ date: key, pct: pctByDate[key] ?? null });
  }

  const getColor = (pct: number | null) => {
    if (pct === null) return "bg-gray-100";
    if (pct === 0) return "bg-red-100";
    if (pct < streakThreshold) return "bg-yellow-200";
    if (pct < 75) return "bg-green-200";
    if (pct < 90) return "bg-green-400";
    return "bg-green-600";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {days.map(({ date, pct }) => (
          <div
            key={date}
            title={`${date}: ${pct !== null ? pct + "%" : "not logged"}`}
            className={`w-3 h-3 rounded-sm ${getColor(pct)} cursor-default`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        <span>Less</span>
        {[
          "bg-gray-100",
          "bg-yellow-200",
          "bg-green-200",
          "bg-green-400",
          "bg-green-600",
        ].map((c) => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
