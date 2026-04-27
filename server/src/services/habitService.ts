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
};
