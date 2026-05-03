import { useEffect, useState } from "react";
import { useHabits } from "@/hooks/useHabits";
import { analyticsApi } from "@/api/analyticsApi";
import type { DashboardStats } from "@/types";
import CompletionSlider from "@/components/CompletionSlider";
import type { Habit } from "@/types";

export default function DashboardPage() {
  const { habits, isLoading, logCompletion } = useHabits();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loggingHabit, setLoggingHabit] = useState<Habit | null>(null);

  useEffect(() => {
    analyticsApi.getDashboard().then((r) => setStats(r.data.data));
  }, [habits]); // Перераховуємо коли habits змінюються

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const notLoggedToday = habits.filter((h) => h.todayPct === null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-0.5">Dashboard</h1>
      <p className="text-sm text-gray-400 mb-6">{today}</p>

      {/* ── Stat cards ──────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Weekly avg", value: `${stats.weekAvgPct}%` },
            { label: "Active streaks", value: stats.activeStreaks },
            {
              label: "Best habit",
              value: stats.bestHabit?.name ?? "—",
              sub: stats.bestHabit ? `${stats.bestHabit.avgPct}%` : "",
            },
            {
              label: "Needs attention",
              value: stats.worstHabit?.name ?? "—",
              sub: stats.worstHabit ? `${stats.worstHabit.avgPct}%` : "",
            },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-lg font-semibold text-gray-900 truncate">
                {value}
              </p>
              {sub && <p className="text-xs text-gray-400">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Not logged today ────────────────────────────── */}
      {notLoggedToday.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Log today — {notLoggedToday.length} remaining
          </h2>
          <div className="space-y-2">
            {notLoggedToday.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {habit.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {habit.currentStreak > 0
                      ? `${habit.currentStreak}-day streak — keep it going`
                      : "Start your streak today"}
                  </p>
                </div>
                <button
                  onClick={() => setLoggingHabit(habit)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Log
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All done ────────────────────────────────────── */}
      {habits.length > 0 && notLoggedToday.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">✓</div>
          <p className="font-medium text-gray-700">
            All habits logged for today!
          </p>
          <p className="text-sm text-gray-400 mt-1">Come back tomorrow</p>
        </div>
      )}

      {loggingHabit && (
        <CompletionSlider
          habit={loggingHabit}
          onSubmit={(pct) => logCompletion(loggingHabit.id, pct)}
          onClose={() => setLoggingHabit(null)}
        />
      )}
    </div>
  );
}
