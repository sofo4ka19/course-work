import { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  type ChartOptions,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useHabits } from "@/hooks/useHabits";
import { analyticsApi } from "@/api/analyticsApi";
import { habitsApi } from "@/api/habitsApi";
import type { ChartData, Completion } from "@/types";
import { localDateStr } from "@/utils/date";
import HeatMap from "@/components/HeatMap";
import Spinner from "@/components/Spinner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Title,
);

ChartJS.defaults.color = "#9ca3af";
ChartJS.defaults.borderColor = "rgba(255,255,255,0.06)";

const PERIODS: { label: string; value: 7 | 30 | 90 }[] = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const LINE_COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#10b981",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AnalyticsPage() {
  const { habits } = useHabits();

  // ── Chart state ─────────────────────────────────────────
  const [chartPeriod, setChartPeriod] = useState<7 | 30 | 90>(30);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // ── Heatmap state ────────────────────────────────────────
  const [heatHabitId, setHeatHabitId] = useState<number | null>(null);
  const [heatPeriod, setHeatPeriod] = useState<7 | 30 | 90>(90);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [heatLoading, setHeatLoading] = useState(false);

  // ── Overview state ───────────────────────────────────────
  const [overviewPeriod, setOverviewPeriod] = useState<7 | 30 | 90>(30);
  const [overviewData, setOverviewData] = useState<
    {
      date: string;
      avgPct: number;
      completedCount: number;
      bestDay: string;
    }[]
  >([]);

  // ── Derived: fall back to first habit until user picks one ──
  const firstHabitId = habits[0]?.id ?? null;
  const effectiveSelectedIds = useMemo(
    () =>
      selectedIds.length > 0
        ? selectedIds
        : firstHabitId !== null
          ? [firstHabitId]
          : [],
    [selectedIds, firstHabitId],
  );
  const effectiveHeatHabitId = heatHabitId ?? firstHabitId;

  // ── Завантаження даних графіка ───────────────────────────
  useEffect(() => {
    if (effectiveSelectedIds.length === 0) return;
    let cancelled = false;
    setChartLoading(true);
    analyticsApi
      .getChart(effectiveSelectedIds, chartPeriod)
      .then((res) => { if (!cancelled) setChartData(res.data.data); })
      .finally(() => { if (!cancelled) setChartLoading(false); });
    return () => { cancelled = true; };
  }, [effectiveSelectedIds, chartPeriod]);

  // ── Завантаження completions для heatmap ─────────────────
  useEffect(() => {
    if (!effectiveHeatHabitId) return;
    let cancelled = false;
    setHeatLoading(true);
    const today = new Date();
    const from = new Date();
    from.setDate(from.getDate() - heatPeriod);
    habitsApi
      .getCompletions(effectiveHeatHabitId, localDateStr(from), localDateStr(today))
      .then((res) => { if (!cancelled) setCompletions(res.data.data); })
      .finally(() => { if (!cancelled) setHeatLoading(false); });
    return () => { cancelled = true; };
  }, [effectiveHeatHabitId, heatPeriod]);

  // ── Завантаження overview даних ──────────────────────────
  useEffect(() => {
    if (habits.length === 0) return;
    let cancelled = false;
    const allIds = habits.map((h) => h.id);
    analyticsApi.getChart(allIds, overviewPeriod).then((res) => {
      if (cancelled) return;
      const series = res.data.data;

      // Build full date range for the selected period (no gaps)
      const rangeEnd = new Date();
      const fullRange: string[] = [];
      for (let i = overviewPeriod - 1; i >= 0; i--) {
        const d = new Date(rangeEnd);
        d.setDate(d.getDate() - i);
        fullRange.push(localDateStr(d));
      }

      // Pre-compute per-date aggregates from API data
      const apiDates = new Set(
        series.flatMap((s) => s.points.map((p) => p.date)),
      );
      const dateMap = new Map<string, { avgPct: number; completedCount: number }>();
      apiDates.forEach((date) => {
        const dayPcts: number[] = [];
        series.forEach((s) => {
          const point = s.points.find((p) => p.date === date);
          if (point) dayPcts.push(point.avgPct);
        });
        const avgPct =
          dayPcts.length > 0
            ? Math.round(dayPcts.reduce((a, b) => a + b, 0) / dayPcts.length)
            : 0;
        dateMap.set(date, { avgPct, completedCount: dayPcts.filter((p) => p > 0).length });
      });

      const processed = fullRange.map((date) => {
        const entry = dateMap.get(date);
        return {
          date,
          avgPct: entry?.avgPct ?? 0,
          completedCount: entry?.completedCount ?? 0,
          bestDay: "",
        };
      });
      const dayBuckets: number[][] = Array.from({ length: 7 }, () => []);
      processed.forEach(({ date, avgPct }) => {
        const day = new Date(date + "T12:00:00").getDay();
        if (avgPct > 0) dayBuckets[day].push(avgPct);
      });
      const dayAvgs = dayBuckets.map((b) =>
        b.length > 0 ? b.reduce((a, c) => a + c, 0) / b.length : 0,
      );
      const bestDayIdx = dayAvgs.indexOf(Math.max(...dayAvgs));
      setOverviewData(
        processed.map((d) => ({ ...d, bestDay: DAY_NAMES[bestDayIdx] ?? "—" })),
      );
    });
    return () => { cancelled = true; };
  }, [habits, overviewPeriod]);

  // ── Helpers ──────────────────────────────────────────────
  const toggleHabit = (id: number) => {
    if (effectiveSelectedIds.includes(id)) {
      setSelectedIds(effectiveSelectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...effectiveSelectedIds, id]);
    }
  };

  const allDates = [
    ...new Set(chartData.flatMap((d) => d.points.map((p) => p.date))),
  ].sort();

  const lineChartData = {
    labels: allDates,
    datasets: chartData.map((series, i) => ({
      label: series.habitName,
      data: allDates.map((date) => {
        const point = series.points.find((p) => p.date === date);
        return point !== undefined ? point.avgPct : null;
      }),
      borderColor: LINE_COLORS[i % LINE_COLORS.length],
      backgroundColor: LINE_COLORS[i % LINE_COLORS.length] + "20",
      tension: 0.3,
      spanGaps: true,
      pointRadius: 3,
    })),
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      x: {
        ticks: { maxTicksLimit: 10 },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label ?? ""}: ${ctx.parsed.y}%`,
        },
      },
    },
  };

  // Overview bar chart — середній % по всіх звичках за день
  const overviewBarData = {
    labels: overviewData.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    }),
    datasets: [
      {
        label: "Avg completion %",
        data: overviewData.map((d) => d.avgPct),
        backgroundColor: overviewData.map((d) =>
          d.avgPct >= 75
            ? "#8b5cf6"
            : d.avgPct >= 40
              ? "#f59e0b"
              : d.avgPct > 0
                ? "#ef4444"
                : "rgba(255,255,255,0.07)",
        ),
        borderRadius: 4,
      },
    ],
  };

  const overviewBarOptions: ChartOptions<"bar"> = {
    responsive: true,
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      x: {
        ticks: { maxTicksLimit: 12 },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ` ${ctx.parsed.y}% avg · ${overviewData[ctx.dataIndex]?.completedCount ?? 0} habits logged`,
        },
      },
    },
  };

  const heatHabit = habits.find((h) => h.id === effectiveHeatHabitId);
  const bestDay = overviewData[0]?.bestDay ?? "—";
  const overallAvg =
    overviewData.length > 0
      ? Math.round(
          overviewData.reduce((s, d) => s + d.avgPct, 0) /
            overviewData.filter((d) => d.avgPct > 0).length || 0,
        )
      : 0;

  if (habits.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-white mb-6">Analytics</h1>
        <p className="text-gray-400 text-sm">
          No habits yet. Create one to see analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Analytics</h1>

      {/* ═══════════════════════════════════════════════════════
          OVERVIEW — загальний графік по всіх звичках
      ═══════════════════════════════════════════════════════ */}
      <div className="bg-card rounded-xl border border-card-border p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-sm font-medium text-white">
              Overall overview
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Average completion across all habits per day
            </p>
          </div>
          <PeriodTabs value={overviewPeriod} onChange={setOverviewPeriod} />
        </div>

        {/* Summary chips */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <Chip label="Period avg" value={`${overallAvg}%`} />
          <Chip label="Most productive day" value={bestDay} />
          <Chip
            label="Best streak day"
            value={
              overviewData.length > 0
                ? DAY_NAMES[
                    overviewData
                      .map((d) => new Date(d.date + "T12:00:00").getDay())
                      .reduce((best, day, _, arr) => {
                        const dayCount = arr.filter((d) => d === day).length;
                        const bestCount = arr.filter((d) => d === best).length;
                        return dayCount > bestCount ? day : best;
                      }, 0)
                  ]
                : "—"
            }
          />
        </div>

        {overviewData.length > 0 ? (
          <Bar data={overviewBarData} options={overviewBarOptions} />
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
        )}

        {/* Day of week breakdown */}
        {overviewData.length > 0 && <DayOfWeekBreakdown data={overviewData} />}
      </div>

      {/* ═══════════════════════════════════════════════════════
          PER-HABIT LINE CHART
      ═══════════════════════════════════════════════════════ */}
      <div className="bg-card rounded-xl border border-card-border p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-medium text-white">
              Per-habit progress
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Select habits to compare
            </p>
          </div>
          <PeriodTabs value={chartPeriod} onChange={setChartPeriod} />
        </div>

        {/* Habit toggles */}
        <div className="flex flex-wrap gap-2 mb-5">
          {habits.map((habit, i) => (
            <button
              key={habit.id}
              onClick={() => toggleHabit(habit.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                effectiveSelectedIds.includes(habit.id)
                  ? "border-transparent text-white"
                  : "border-card-border text-gray-400 bg-card hover:bg-surface"
              }`}
              style={
                effectiveSelectedIds.includes(habit.id)
                  ? { backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }
                  : {}
              }
            >
              {habit.name}
            </button>
          ))}
        </div>

        {chartLoading ? (
          <Spinner />
        ) : effectiveSelectedIds.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Select at least one habit above
          </p>
        ) : allDates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No data for the selected period
          </p>
        ) : (
          <Line data={lineChartData} options={chartOptions} />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          HEATMAP
      ═══════════════════════════════════════════════════════ */}
      <div className="bg-card rounded-xl border border-card-border p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-medium text-white">
              Completion heatmap
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Daily completion for one habit
            </p>
          </div>
          <PeriodTabs value={heatPeriod} onChange={setHeatPeriod} />
        </div>

        {/* Habit selector */}
        <div className="flex flex-wrap gap-2 mb-5">
          {habits.map((h) => (
            <button
              key={h.id}
              onClick={() => setHeatHabitId(h.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                effectiveHeatHabitId === h.id
                  ? "bg-accent-500 border-transparent text-white"
                  : "border-card-border text-gray-400 bg-card hover:bg-surface"
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>

        {heatLoading ? (
          <Spinner />
        ) : heatHabit ? (
          <HeatMap
            completions={completions}
            streakThreshold={heatHabit.streakThreshold}
            days={heatPeriod}
          />
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">
            Select a habit above
          </p>
        )}
      </div>
    </div>
  );
}

// ── Допоміжні компоненти ────────────────────────────────────

function PeriodTabs({
  value,
  onChange,
}: {
  value: 7 | 30 | 90;
  onChange: (v: 7 | 30 | 90) => void;
}) {
  return (
    <div className="flex rounded-lg border border-card-border overflow-hidden shrink-0">
      {PERIODS.map(({ label, value: v }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 text-xs transition-colors ${
            value === v
              ? "bg-accent-500 text-white"
              : "text-gray-400 hover:bg-surface"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface rounded-lg px-3 py-1.5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DayOfWeekBreakdown({
  data,
}: {
  data: { date: string; avgPct: number }[];
}) {
  // Рахуємо середнє по кожному дню тижня
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  data.forEach(({ date, avgPct }) => {
    if (avgPct > 0) buckets[new Date(date).getDay()].push(avgPct);
  });

  const dayAvgs = buckets.map((b) =>
    b.length > 0 ? Math.round(b.reduce((a, c) => a + c, 0) / b.length) : 0,
  );

  const max = Math.max(...dayAvgs, 1);

  return (
    <div className="mt-5 pt-5 border-t border-card-border">
      <p className="text-xs text-gray-400 mb-3">Average by day of week</p>
      <div className="flex gap-2 items-end h-16">
        {DAY_NAMES.map((name, i) => {
          const pct = dayAvgs[i];
          const height = Math.round((pct / max) * 100);
          const isMax = pct === max && pct > 0;
          return (
            <div key={name} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">
                {pct > 0 ? pct + "%" : ""}
              </span>
              <div className="w-full flex items-end" style={{ height: 36 }}>
                <div
                  className={`w-full rounded-t transition-all ${
                    isMax ? "bg-accent-500" : "bg-gray-700"
                  }`}
                  style={{ height: pct > 0 ? `${height}%` : "2px" }}
                />
              </div>
              <span
                className={`text-xs font-medium ${isMax ? "text-accent-400" : "text-gray-500"}`}
              >
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
