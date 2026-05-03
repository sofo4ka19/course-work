import { useEffect, useState } from "react";
import { useHabits } from "@/hooks/useHabits";
import { analyticsApi } from "@/api/analyticsApi";
import { habitsApi } from "@/api/habitsApi";
import type { DashboardStats, Habit } from "@/types";
import { CompletionSlider } from "@/components/CompletionSlider";
import Spinner from "@/components/Spinner";
import SectionLabel from "@/components/SectionLabel";
import StatCard from "@/components/StatCard";

export default function DashboardPage() {
  const { habits, isLoading, logCompletion } = useHabits();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logging, setLogging] = useState<Habit | null>(null);
  const [completionsMap, setCompletionsMap] = useState<
    Record<number, Record<string, number>>
  >({});

  useEffect(() => {
    analyticsApi.getDashboard().then((r) => setStats(r.data.data));
  }, [habits]);

  // Завантажуємо completions для date picker
  useEffect(() => {
    if (!habits.length) return;
    Promise.all(
      habits.map((h) =>
        habitsApi
          .getCompletions(h.id)
          .then((r) => ({ id: h.id, data: r.data.data })),
      ),
    ).then((results) => {
      const map: Record<number, Record<string, number>> = {};
      for (const { id, data } of results) {
        map[id] = {};
        for (const c of data) {
          map[id][c.completionDate.split("T")[0]] = c.completionPct;
        }
      }
      setCompletionsMap(map);
    });
  }, [habits]);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const notLogged = habits.filter((h) => h.todayPct === null);
  const logged = habits.filter((h) => h.todayPct !== null);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1 className="text-xl font-extrabold text-gray-900">Dashboard</h1>
      <p className="text-sm text-gray-400 mt-0.5 mb-6">{today}</p>

      {/* stat cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard label="Weekly avg" value={`${stats.weekAvgPct}%`} accent />
          <StatCard
            label="Active streaks"
            value={`${stats.activeStreaks} / ${habits.length}`}
          />
          {stats.bestHabit && (
            <StatCard
              label="Best habit"
              value={stats.bestHabit.name}
              sub={`${stats.bestHabit.avgPct}% avg`}
              positive
            />
          )}
          {stats.worstHabit && (
            <StatCard
              label="Needs attention"
              value={stats.worstHabit.name}
              sub={`${stats.worstHabit.avgPct}% avg`}
              negative
            />
          )}
        </div>
      )}

      {/* not logged */}
      {notLogged.length > 0 && (
        <section className="mb-6">
          <SectionLabel
            text="Log today"
            badge={`${notLogged.length} remaining`}
            badgeCls="bg-accent-100 text-accent-700"
          />
          <div className="space-y-2">
            {notLogged.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between bg-card rounded-xl border border-card-border px-4 py-3 hover:border-accent-200 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {habit.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {habit.currentStreak > 0
                      ? `🔥 ${habit.currentStreak}-day streak — keep it going`
                      : "Start your streak today"}
                  </p>
                </div>
                <button
                  onClick={() => setLogging(habit)}
                  className="px-3 py-1.5 bg-gradient-to-r from-accent-500 to-accent-400 text-white text-xs font-bold rounded-lg shrink-0 ml-3"
                >
                  Log
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* logged */}
      {logged.length > 0 && (
        <section>
          <SectionLabel
            text="Done today"
            badge={`${logged.length}`}
            badgeCls="bg-success-100 text-success-700"
          />
          <div className="space-y-2">
            {logged.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between bg-success-50 rounded-xl border border-success-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {habit.name}
                  </p>
                  <p className="text-xs text-success-700 mt-0.5 font-medium">
                    ✓ Logged at {habit.todayPct}%
                  </p>
                </div>
                <button
                  onClick={() => setLogging(habit)}
                  className="px-3 py-1.5 bg-white hover:bg-success-100 text-success-700 border border-success-200 text-xs font-bold rounded-lg shrink-0 ml-3"
                >
                  Update
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {habits.length > 0 && notLogged.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
            ✓
          </div>
          <p className="font-bold text-gray-700">
            All habits logged for today!
          </p>
          <p className="text-sm text-gray-400 mt-1">Come back tomorrow</p>
        </div>
      )}

      {logging && (
        <CompletionSlider
          habit={logging}
          onSubmit={(pct, date) => logCompletion(logging.id, pct, date)}
          onClose={() => setLogging(null)}
          existingCompletions={completionsMap[logging.id] ?? {}}
        />
      )}
    </div>
  );
}
