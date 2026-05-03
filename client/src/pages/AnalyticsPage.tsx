import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useHabits } from "@/hooks/useHabits";
import { analyticsApi } from "@/api/analyticsApi";
import { habitsApi } from "@/api/habitsApi";
import type { ChartData, Completion } from "@/types";
import HeatMap from "@/components/HeatMap";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

const PERIODS = [
  { label: "7 days", value: 7 as const },
  { label: "30 days", value: 30 as const },
  { label: "90 days", value: 90 as const },
];

const LINE_COLORS = [
  "#16a34a",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

export default function AnalyticsPage() {
  const { habits } = useHabits();
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [activeHabitId, setActiveHabitId] = useState<number | null>(null);

  const defaultHabitId = habits[0]?.id ?? null;
  const selectedIdsResolved = useMemo(
    () =>
      selectedIds.length > 0
        ? selectedIds
        : defaultHabitId
          ? [defaultHabitId]
          : [],
    [selectedIds, defaultHabitId],
  );
  const activeHabitIdResolved = useMemo(
    () => activeHabitId ?? defaultHabitId,
    [activeHabitId, defaultHabitId],
  );

  // Завантажуємо дані графіка
  useEffect(() => {
    if (selectedIdsResolved.length === 0) return;
    analyticsApi
      .getChart(selectedIdsResolved, period)
      .then((r) => setChartData(r.data.data));
  }, [selectedIdsResolved, period]);

  // Завантажуємо completions для теплової карти
  useEffect(() => {
    if (!activeHabitIdResolved) return;
    habitsApi
      .getCompletions(activeHabitIdResolved)
      .then((r) => setCompletions(r.data.data));
  }, [activeHabitIdResolved]);

  const toggleHabit = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Збираємо всі унікальні дати з усіх серій
  const allDates = [
    ...new Set(chartData.flatMap((d) => d.points.map((p) => p.date))),
  ].sort();

  const lineChartData = {
    labels: allDates,
    datasets: chartData.map((series, i) => ({
      label: series.habitName,
      data: allDates.map((date) => {
        const point = series.points.find((p) => p.date === date);
        return point ? point.avgPct : null;
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
        ticks: { callback: (v: string | number) => `${v}%` },
      },
      x: { ticks: { maxTicksLimit: 8 } },
    },
    plugins: { legend: { position: "bottom" as const } },
  };

  const activeHabit = habits.find((h) => h.id === activeHabitId);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Analytics</h1>

      {habits.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No habits yet. Create one to see analytics.
        </p>
      ) : (
        <>
          {/* ── Chart section ─────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-sm font-medium text-gray-700">
                Progress over time
              </h2>

              {/* Period selector */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {PERIODS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setPeriod(value)}
                    className={`px-3 py-1.5 text-xs transition-colors ${
                      period === value
                        ? "bg-green-600 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Habit toggles */}
            <div className="flex flex-wrap gap-2 mb-5">
              {habits.map((habit, i) => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedIds.includes(habit.id)
                      ? "border-transparent text-white"
                      : "border-gray-200 text-gray-500 bg-white"
                  }`}
                  style={
                    selectedIds.includes(habit.id)
                      ? { backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }
                      : {}
                  }
                >
                  {habit.name}
                </button>
              ))}
            </div>

            {allDates.length > 0 ? (
              <Line data={lineChartData} options={chartOptions} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">
                No data for selected period
              </p>
            )}
          </div>

          {/* ── Heat map section ───────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-700">
                90-day heatmap
              </h2>
              <select
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600"
                value={activeHabitId ?? ""}
                onChange={(e) => setActiveHabitId(Number(e.target.value))}
              >
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            {activeHabit && (
              <HeatMap
                completions={completions}
                streakThreshold={activeHabit.streakThreshold}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
