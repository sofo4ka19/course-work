import { prisma } from "@/lib/prisma";
import { HabitFormData } from "@/types";

export const habitService = {
  async getAllByUser(userId: number) {
    const habits = await prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // Для кожної звички рахуємо todayPct і weekAvgPct
    // Це обчислюється на сервері щоб фронтенд отримав готові дані
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return Promise.all(
      habits.map(async (habit) => {
        const todayCompletion = await prisma.completion.findUnique({
          where: {
            habitId_completionDate: {
              habitId: habit.id,
              completionDate: today,
            },
          },
        });

        const weekCompletions = await prisma.completion.findMany({
          where: {
            habitId: habit.id,
            completionDate: { gte: weekAgo },
          },
        });

        const weekAvgPct =
          weekCompletions.length > 0
            ? Math.round(
                weekCompletions.reduce((sum, c) => sum + c.completionPct, 0) /
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
        streakThreshold: data.streakThreshold,
      },
    });
  },

  async update(habitId: number, userId: number, data: Partial<HabitFormData>) {
    // Перевіряємо що звичка належить цьому користувачу
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) {
      throw new Error("NOT_FOUND");
    }

    return prisma.habit.update({
      where: { id: habitId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.frequency && { frequency: data.frequency }),
        ...(data.streakThreshold !== undefined && {
          streakThreshold: data.streakThreshold,
        }),
      },
    });
  },

  async delete(habitId: number, userId: number) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) {
      throw new Error("NOT_FOUND");
    }
    // onDelete: Cascade у schema видалить всі completions автоматично
    await prisma.habit.delete({ where: { id: habitId } });
  },

  async upsertCompletion(
    habitId: number,
    userId: number,
    completionPct: number,
  ) {
    // Спочатку перевіряємо ownership
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) {
      throw new Error("NOT_FOUND");
    }

    if (completionPct < 0 || completionPct > 100) {
      throw new Error("INVALID_PCT");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // upsert = insert якщо не існує, update якщо існує
    // Це безпечніше ніж перевіряти вручну — немає race condition
    const completion = await prisma.completion.upsert({
      where: {
        habitId_completionDate: { habitId, completionDate: today },
      },
      update: { completionPct },
      create: { habitId, completionDate: today, completionPct },
    });

    // Після кожної фіксації — перераховуємо серію
    await this.recalculateStreak(habitId);

    return completion;
  },

  async getCompletions(habitId: number, userId: number, from: Date, to: Date) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) {
      throw new Error("NOT_FOUND");
    }

    return prisma.completion.findMany({
      where: {
        habitId,
        completionDate: { gte: from, lte: to },
      },
      orderBy: { completionDate: "asc" },
    });
  },

  async recalculateStreak(habitId: number) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) return;

    // Беремо всі completions у зворотньому порядку (найновіші спочатку)
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Серія активна тільки якщо є запис за сьогодні або вчора
    // Якщо останній запис позавчора і раніше — серія вже перервана
    const lastDate = new Date(completions[0]!.completionDate);
    lastDate.setHours(0, 0, 0, 0);

    const isActive =
      lastDate.getTime() === today.getTime() ||
      lastDate.getTime() === yesterday.getTime();

    if (!isActive) {
      await prisma.habit.update({
        where: { id: habitId },
        data: { currentStreak: 0 },
      });
      return;
    }

    // Рахуємо послідовні дні де pct >= streakThreshold
    let streak = 0;
    let expectedDate = new Date(lastDate);

    for (const completion of completions) {
      const completionDate = new Date(completion.completionDate);
      completionDate.setHours(0, 0, 0, 0);

      // Якщо пропустили день — серія переривається
      if (completionDate.getTime() !== expectedDate.getTime()) break;

      // Якщо цього дня виконання нижче порогу — теж переривається
      if (completion.completionPct < habit.streakThreshold) break;

      streak++;
      // Наступна очікувана дата — день раніше
      expectedDate.setDate(expectedDate.getDate() - 1);
    }

    await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak: streak,
        // maxStreak ніколи не зменшується — це рекорд
        maxStreak: Math.max(habit.maxStreak, streak),
      },
    });
  },
};
