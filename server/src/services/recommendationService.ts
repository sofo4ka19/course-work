import { prisma } from "@/lib/prisma";

interface HabitAnalysis {
  habitId: number;
  habitName: string;
  avgPct: number;
  recentPcts: number[]; // останні 30 днів
  currentStreak: number;
  maxStreak: number;
  streakThreshold: number;
  dayOfWeekAvg: number[]; // індекс 0=нд, 1=пн, ..., 6=сб
}

export const recommendationService = {
  async generate(userId: number): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        completions: {
          where: { completionDate: { gte: thirtyDaysAgo } },
          orderBy: { completionDate: "asc" },
        },
      },
    });

    if (habits.length === 0) return 0;

    // Аналізуємо кожну звичку
    const analyses: HabitAnalysis[] = habits.map((habit) => {
      const pcts = habit.completions.map((c) => c.completionPct);
      const avgPct =
        pcts.length > 0
          ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
          : 0;

      // Середнє по днях тижня [нд, пн, вт, ср, чт, пт, сб]
      const dayBuckets: number[][] = Array.from({ length: 7 }, () => []);
      habit.completions.forEach((c) => {
        const day = new Date(c.completionDate).getDay();
        dayBuckets[day]!.push(c.completionPct);
      });
      const dayOfWeekAvg = dayBuckets.map(
        (bucket) =>
          bucket.length > 0
            ? Math.round(bucket.reduce((a, b) => a + b, 0) / bucket.length)
            : -1, // -1 = немає даних
      );

      return {
        habitId: habit.id,
        habitName: habit.name,
        avgPct,
        recentPcts: pcts,
        currentStreak: habit.currentStreak,
        maxStreak: habit.maxStreak,
        streakThreshold: habit.streakThreshold,
        dayOfWeekAvg,
      };
    });

    const recommendations: {
      userId: number;
      habitId: number | null;
      content: string;
    }[] = [];

    const DAY_NAMES = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    for (const a of analyses) {
      // ── Правило 1: Низький середній pct ──────────────────────
      if (a.avgPct < 40 && a.recentPcts.length >= 5) {
        recommendations.push({
          userId,
          habitId: a.habitId,
          content:
            `Your average for "${a.habitName}" is only ${a.avgPct}% over the last 30 days. ` +
            `Consider lowering your streak threshold (currently ${a.streakThreshold}%) ` +
            `to make it more achievable and build momentum gradually.`,
        });
      }

      // ── Правило 2: Ризик переривання серії ───────────────────
      if (a.currentStreak > 0 && a.currentStreak >= 3) {
        const lastThree = a.recentPcts.slice(-3);
        const trend =
          lastThree.length === 3 ? lastThree[2]! - lastThree[0]! : 0;
        if (trend < -20) {
          recommendations.push({
            userId,
            habitId: a.habitId,
            content:
              `"${a.habitName}" shows a declining trend over the last 3 days ` +
              `(dropped ${Math.abs(trend)}%). You're on a ${a.currentStreak}-day streak — ` +
              `try to do at least ${a.streakThreshold}% today to keep it going.`,
          });
        }
      }

      // ── Правило 3: Слабкий день тижня ────────────────────────
      const validDays = a.dayOfWeekAvg
        .map((avg, i) => ({ avg, i }))
        .filter((d) => d.avg >= 0)
        .sort((x, y) => x.avg - y.avg);

      if (validDays.length > 0) {
        const weakDay = validDays[0]!;
        if (weakDay.avg < a.avgPct - 20) {
          recommendations.push({
            userId,
            habitId: a.habitId,
            content:
              `${DAY_NAMES[weakDay.i]}s are consistently your weakest day for ` +
              `"${a.habitName}" (avg ${weakDay.avg}% vs your overall ${a.avgPct}%). ` +
              `Try scheduling it earlier on ${DAY_NAMES[weakDay.i]}s or pairing it with another routine.`,
          });
        }
      }

      // ── Правило 4: Рекордна серія перевершена ────────────────
      if (
        a.currentStreak > 0 &&
        a.currentStreak === a.maxStreak &&
        a.maxStreak >= 7
      ) {
        recommendations.push({
          userId,
          habitId: a.habitId,
          content:
            `You're on your longest ever streak for "${a.habitName}" — ${a.currentStreak} days! ` +
            `Keep it up. Consider increasing your streak threshold to ${Math.min(a.streakThreshold + 10, 100)}% ` +
            `to push yourself further.`,
        });
      }
    }

    // ── Правило 5: Загальна порада по всіх звичках ───────────────
    const overallAvg = Math.round(
      analyses.reduce((s, a) => s + a.avgPct, 0) / analyses.length,
    );
    if (overallAvg < 60 && habits.length >= 3) {
      recommendations.push({
        userId,
        habitId: null,
        content:
          `Your overall average across all habits is ${overallAvg}%. ` +
          `Research suggests focusing on 2–3 habits at a time is more effective than tracking many at once. ` +
          `Consider pausing your lowest-priority habits temporarily.`,
      });
    }

    if (recommendations.length === 0) return 0;

    // Зберігаємо у БД — deleteMany спочатку прибирає старі непрочитані
    await prisma.recommendation.deleteMany({
      where: { userId, isRead: false },
    });
    await prisma.recommendation.createMany({ data: recommendations });

    return recommendations.length;
  },
};
