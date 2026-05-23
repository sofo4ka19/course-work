import { prisma } from "@/lib/prisma";
import { HabitFormData } from "@/types";
import {
  localDateStr,
  strToUTC,
  strToUTCEnd,
  daysAgoStr,
  isoWeek,
  prevIsoWeek,
} from "@/utils/date";

export const habitService = {
  async getAllByUser(userId: number) {
    const habits = await prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    const todayStart = strToUTC(localDateStr());
    const todayEnd = strToUTCEnd(localDateStr());
    const weekAgo = strToUTC(daysAgoStr(7));

    return Promise.all(
      habits.map(async (habit) => {
        const todayCompletion = await prisma.completion.findFirst({
          where: {
            habitId: habit.id,
            completionDate: { gte: todayStart, lte: todayEnd },
          },
        });

        const weekCompletions = await prisma.completion.findMany({
          where: {
            habitId: habit.id,
            completionDate: { gte: weekAgo, lte: todayEnd },
          },
        });

        const weekAvgPct =
          weekCompletions.length > 0
            ? Math.round(
                weekCompletions.reduce((s, c) => s + c.completionPct, 0) /
                  weekCompletions.length,
              )
            : null;

        return {
          ...habit,
          todayPct: todayCompletion?.completionPct ?? null,
          weekAvgPct,
        };
      }),
    );
  },

  async create(userId: number, data: HabitFormData) {
    return prisma.habit.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        frequency: data.frequency,
        customFrequency:
          data.frequency === "custom" ? (data.customFrequency ?? null) : null,
        streakThreshold: data.streakThreshold,
      },
    });
  },

  async update(habitId: number, userId: number, data: Partial<HabitFormData>) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) throw new Error("NOT_FOUND");

    return prisma.habit.update({
      where: { id: habitId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        // якщо frequency змінюється на non-custom — очищаємо customFrequency
        ...(data.frequency === "custom"
          ? { customFrequency: data.customFrequency ?? null }
          : data.frequency !== undefined
            ? { customFrequency: null }
            : {}),
        ...(data.streakThreshold !== undefined && {
          streakThreshold: data.streakThreshold,
        }),
      },
    });
  },

  async delete(habitId: number, userId: number) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) throw new Error("NOT_FOUND");
    await prisma.habit.delete({ where: { id: habitId } });
  },

  // dateStr = "YYYY-MM-DD" або undefined (сьогодні)
  async upsertCompletion(
    habitId: number,
    userId: number,
    completionPct: number,
    dateStr?: string,
  ) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) throw new Error("NOT_FOUND");
    if (completionPct < 0 || completionPct > 100)
      throw new Error("INVALID_PCT");

    // ← Ключове виправлення: localDateStr() в LOCAL часі
    const targetStr = dateStr ?? localDateStr();
    const dateUTC = strToUTC(targetStr);

    const completion = await prisma.completion.upsert({
      where: { habitId_completionDate: { habitId, completionDate: dateUTC } },
      update: { completionPct },
      create: { habitId, completionDate: dateUTC, completionPct },
    });

    await this.recalculateStreak(habitId);
    return completion;
  },

  async getCompletions(habitId: number, userId: number, from: Date, to: Date) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) throw new Error("NOT_FOUND");

    return prisma.completion.findMany({
      where: { habitId, completionDate: { gte: from, lte: to } },
      orderBy: { completionDate: "asc" },
    });
  },

  async recalculateStreak(habitId: number) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) return;

    const completions = await prisma.completion.findMany({
      where: { habitId },
      orderBy: { completionDate: "desc" },
    });

    if (completions.length === 0) {
      await prisma.habit.update({
        where: { id: habitId },
        data: { currentStreak: 0 },
      });
      return;
    }

    // ── Weekly streak ────────────────────────────────────────
    if (habit.frequency === "weekly") {
      const weekMap = new Map<string, number>();
      for (const c of completions) {
        const wk = isoWeek(c.completionDate);
        const cur = weekMap.get(wk) ?? 0;
        weekMap.set(wk, Math.max(cur, c.completionPct));
      }

      const thisWeek = isoWeek(new Date());
      const lastWeek = prevIsoWeek(thisWeek);
      const sorted = [...weekMap.keys()].sort().reverse();

      if (
        !sorted.length ||
        (sorted[0] !== thisWeek && sorted[0] !== lastWeek)
      ) {
        await prisma.habit.update({
          where: { id: habitId },
          data: { currentStreak: 0 },
        });
        return;
      }

      let streak = 0;
      let expected = sorted[0];

      for (const wk of sorted) {
        if (wk !== expected) break;
        if ((weekMap.get(wk) ?? 0) < habit.streakThreshold) break;
        streak++;
        expected = prevIsoWeek(expected);
      }

      await prisma.habit.update({
        where: { id: habitId },
        data: {
          currentStreak: streak,
          maxStreak: Math.max(habit.maxStreak, streak),
        },
      });
      return;
    }

    // ── Custom: N times per week ─────────────────────────────
    if (habit.frequency === "custom" && habit.customFrequency) {
      const timesPerWeek = parseInt(habit.customFrequency, 10);

      if (!isNaN(timesPerWeek) && timesPerWeek >= 2) {
        // count qualifying completions (>= threshold) per ISO week
        const weekCountMap = new Map<string, number>();
        for (const c of completions) {
          if (c.completionPct >= habit.streakThreshold) {
            const wk = isoWeek(c.completionDate);
            weekCountMap.set(wk, (weekCountMap.get(wk) ?? 0) + 1);
          }
        }

        const thisWeek = isoWeek(new Date());

        // starting week: this week (if already hit target) or last week
        const startWeek =
          (weekCountMap.get(thisWeek) ?? 0) >= timesPerWeek
            ? thisWeek
            : prevIsoWeek(thisWeek);

        if ((weekCountMap.get(startWeek) ?? 0) < timesPerWeek) {
          await prisma.habit.update({
            where: { id: habitId },
            data: { currentStreak: 0 },
          });
          return;
        }

        let streak = 0;
        let expected = startWeek;
        while ((weekCountMap.get(expected) ?? 0) >= timesPerWeek) {
          streak++;
          expected = prevIsoWeek(expected);
        }

        await prisma.habit.update({
          where: { id: habitId },
          data: {
            currentStreak: streak,
            maxStreak: Math.max(habit.maxStreak, streak),
          },
        });
        return;
      }
    }

    // ── Daily streak ─────────────────────────────────────────
    const todayStr = localDateStr();
    const yesterdayStr = daysAgoStr(1);
    const lastStr = localDateStr(completions[0]!.completionDate);

    if (lastStr !== todayStr && lastStr !== yesterdayStr) {
      await prisma.habit.update({
        where: { id: habitId },
        data: { currentStreak: 0 },
      });
      return;
    }

    let streak = 0;
    let expectedStr = lastStr;

    for (const c of completions) {
      const cStr = localDateStr(c.completionDate);
      if (cStr !== expectedStr) break;
      if (c.completionPct < habit.streakThreshold) break;
      streak++;
      const prev = new Date(`${expectedStr}T12:00:00Z`);
      prev.setUTCDate(prev.getUTCDate() - 1);
      expectedStr = localDateStr(prev);
    }

    await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak: streak,
        maxStreak: Math.max(habit.maxStreak, streak),
      },
    });
  },
};
