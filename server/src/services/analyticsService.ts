import { prisma } from "@/lib/prisma";

export const analyticsService = {
  async getDashboardStats(userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        completions: {
          where: { completionDate: { gte: weekAgo } },
        },
      },
    });

    if (habits.length === 0) {
      return {
        weekAvgPct: 0,
        activeStreaks: 0,
        bestHabit: null,
        worstHabit: null,
      };
    }

    // Рахуємо середній pct за тиждень для кожної звички
    const habitStats = habits.map((h) => {
      const avg =
        h.completions.length > 0
          ? Math.round(
              h.completions.reduce((s, c) => s + c.completionPct, 0) /
                h.completions.length,
            )
          : 0;
      return {
        id: h.id,
        name: h.name,
        avgPct: avg,
        currentStreak: h.currentStreak,
      };
    });

    const weekAvgPct = Math.round(
      habitStats.reduce((s, h) => s + h.avgPct, 0) / habitStats.length,
    );

    const activeStreaks = habitStats.filter((h) => h.currentStreak > 0).length;

    const sorted = [...habitStats].sort((a, b) => b.avgPct - a.avgPct);
    const bestHabit = sorted[0]
      ? { name: sorted[0].name, avgPct: sorted[0].avgPct }
      : null;
    const worstHabit = sorted.at(-1)
      ? { name: sorted.at(-1)!.name, avgPct: sorted.at(-1)!.avgPct }
      : null;

    return { weekAvgPct, activeStreaks, bestHabit, worstHabit };
  },

  async getChartData(userId: number, habitIds: number[], period: 7 | 30 | 90) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(today);
    from.setDate(from.getDate() - period);

    // Перевіряємо що всі запитані звички належать цьому користувачу
    const habits = await prisma.habit.findMany({
      where: { id: { in: habitIds }, userId },
      include: {
        completions: {
          where: { completionDate: { gte: from, lte: today } },
          orderBy: { completionDate: "asc" },
        },
      },
    });

    return habits.map((habit) => ({
      habitId: habit.id,
      habitName: habit.name,
      points: habit.completions.map((c) => ({
        // Форматуємо дату як "YYYY-MM-DD" для Chart.js
        date: c.completionDate.toISOString().split("T")[0],
        avgPct: c.completionPct,
      })),
    }));
  },
};
