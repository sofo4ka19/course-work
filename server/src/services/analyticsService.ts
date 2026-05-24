import { prisma } from "@/lib/prisma";
import {
  localDateStr,
  strToUTC,
  strToUTCEnd,
  daysAgoStr,
  strToLocal,
} from "@/utils/date";

export const analyticsService = {
  async getDashboardStats(userId: number) {
    const todayEnd = strToUTCEnd(localDateStr());
    const weekAgo = strToUTC(daysAgoStr(7));

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        completions: {
          where: { completionDate: { gte: weekAgo, lte: todayEnd } },
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

    const stats = habits.map((h) => {
      const avg =
        h.completions.length > 0
          ? Math.round(
              h.completions.reduce((s, c) => s + c.completionPct, 0) /
                h.completions.length,
            )
          : 0;
      return { name: h.name, avgPct: avg, currentStreak: h.currentStreak };
    });

    const weekAvgPct = Math.round(
      stats.reduce((s, h) => s + h.avgPct, 0) / stats.length,
    );
    // "Active streak" = ≥ 2 consecutive periods. A streak of 1 just means
    // "logged today/this week", not yet a real streak.
    const activeStreaks = stats.filter((h) => h.currentStreak >= 2).length;
    const sorted = [...stats].sort((a, b) => b.avgPct - a.avgPct);

    const bestHabit =
      sorted[0] && sorted[0].avgPct > 0
        ? { name: sorted[0]!.name, avgPct: sorted[0]!.avgPct }
        : null;
    const worstHabit =
      sorted.at(-1) && sorted.at(-1)!.name !== sorted[0]?.name
        ? { name: sorted.at(-1)!.name, avgPct: sorted.at(-1)!.avgPct }
        : null;

    return {
      weekAvgPct,
      activeStreaks,
      bestHabit,
      worstHabit,
    };
  },

  async getChartData(userId: number, habitIds: number[], period: 7 | 30 | 90) {
    const todayEnd = strToUTCEnd(localDateStr());
    const from = strToUTC(daysAgoStr(period));

    const habits = await prisma.habit.findMany({
      where: { id: { in: habitIds }, userId },
      include: {
        completions: {
          where: { completionDate: { gte: from, lte: todayEnd } },
          orderBy: { completionDate: "asc" },
        },
      },
    });

    return habits.map((habit) => ({
      habitId: habit.id,
      habitName: habit.name,
      points: habit.completions.map((c) => ({
        date: localDateStr(c.completionDate), // ← local, не UTC
        avgPct: c.completionPct,
      })),
    }));
  },

  /** Загальний графік: середній % по всіх звичках за день */
  async getOverview(userId: number, period: 7 | 30 | 90 | 365) {
    const todayEnd = strToUTCEnd(localDateStr());
    const from = strToUTC(daysAgoStr(period));

    const completions = await prisma.completion.findMany({
      where: {
        habit: { userId },
        completionDate: { gte: from, lte: todayEnd },
      },
      include: { habit: { select: { name: true } } },
      orderBy: { completionDate: "asc" },
    });

    // Групуємо по дні
    const byDate = new Map<string, number[]>();
    for (const c of completions) {
      const key = localDateStr(c.completionDate);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(c.completionPct);
    }

    // Кращий день тижня
    const dayBuckets: number[][] = Array.from({ length: 7 }, () => []);
    for (const [dateStr, pcts] of byDate) {
      const day = strToLocal(dateStr).getDay();
      const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
      dayBuckets[day]!.push(avg);
    }
    const dayAvgs = dayBuckets.map((b) =>
      b.length > 0 ? Math.round(b.reduce((a, c) => a + c, 0) / b.length) : 0,
    );
    const maxDayAvg = Math.max(...dayAvgs);
    const bestDayIdx = maxDayAvg > 0 ? dayAvgs.indexOf(maxDayAvg) : 0;
    const DAY_NAMES = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const points = [...byDate.entries()].map(([date, pcts]) => ({
      date,
      avgPct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      completedCount: pcts.filter((p) => p > 0).length,
    }));

    return {
      points,
      dayAvgs,
      bestDay: DAY_NAMES[bestDayIdx],
      bestDayIdx,
    };
  },
};
