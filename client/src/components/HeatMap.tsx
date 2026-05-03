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
    pctByDate[c.completionDate.split("T")[0]] = c.completionPct;
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
    if (pct === null) return "bg-gray-800";
    if (pct === 0) return "bg-red-900";
    if (pct < streakThreshold) return "bg-violet-900";
    if (pct < 75) return "bg-accent-700";
    if (pct < 90) return "bg-accent-500";
    return "bg-accent-300";
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
          "bg-gray-800",
          "bg-violet-900",
          "bg-accent-700",
          "bg-accent-500",
          "bg-accent-300",
        ].map((c) => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
