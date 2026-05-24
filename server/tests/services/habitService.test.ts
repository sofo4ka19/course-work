import { prismaMock, resetPrismaMock } from "../__mocks__/prismaMock";
import { habitService } from "@/services/habitService";
import { strToUTC } from "@/utils/date";

const baseHabit = {
  id: 1,
  userId: 1,
  name: "Run",
  description: null,
  frequency: "daily",
  customFrequency: null,
  streakThreshold: 50,
  currentStreak: 0,
  maxStreak: 0,
  createdAt: new Date(),
};

describe("habitService", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe("getAllByUser", () => {
    it("returns habits with todayPct and weekAvgPct", async () => {
      prismaMock.habit.findMany.mockResolvedValue([baseHabit]);
      prismaMock.completion.findFirst.mockResolvedValue({ completionPct: 80 });
      prismaMock.completion.findMany.mockResolvedValue([
        { completionPct: 80 },
        { completionPct: 60 },
      ]);

      const result = await habitService.getAllByUser(1);

      expect(result).toHaveLength(1);
      expect(result[0]!.todayPct).toBe(80);
      expect(result[0]!.weekAvgPct).toBe(70);
    });

    it("returns null todayPct when no completion today", async () => {
      prismaMock.habit.findMany.mockResolvedValue([baseHabit]);
      prismaMock.completion.findFirst.mockResolvedValue(null);
      prismaMock.completion.findMany.mockResolvedValue([]);

      const result = await habitService.getAllByUser(1);
      expect(result[0]!.todayPct).toBeNull();
      expect(result[0]!.weekAvgPct).toBeNull();
    });

    it("resets stored streak to 0 when the most recent log is too old", async () => {
      // DB has a stale streak of 5 from old logs, but last completion is 4 days ago
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      const staleHabit = { ...baseHabit, currentStreak: 5, maxStreak: 5 };

      // initial fetch (stale data)
      prismaMock.habit.findMany.mockResolvedValueOnce([staleHabit]);
      // for recalculateStreak: findUnique for the habit
      prismaMock.habit.findUnique.mockResolvedValue(staleHabit);
      // recalculateStreak fetches completions — only one, four days ago
      prismaMock.completion.findMany.mockResolvedValueOnce([
        { completionDate: fourDaysAgo, completionPct: 80 },
      ]);
      // recalculateStreak calls habit.update to zero the streak
      prismaMock.habit.update.mockResolvedValue({
        ...staleHabit,
        currentStreak: 0,
      });
      // re-fetch after recalculation
      prismaMock.habit.findMany.mockResolvedValueOnce([
        { ...staleHabit, currentStreak: 0 },
      ]);
      // findFirst (todayCompletion) + findMany (weekCompletions)
      prismaMock.completion.findFirst.mockResolvedValue(null);
      prismaMock.completion.findMany.mockResolvedValueOnce([]);

      const result = await habitService.getAllByUser(1);

      expect(result[0]!.currentStreak).toBe(0);
      // recalculateStreak must have been invoked
      expect(prismaMock.habit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ currentStreak: 0 }),
        }),
      );
    });
  });

  describe("create", () => {
    it("creates a habit with daily frequency", async () => {
      prismaMock.habit.create.mockResolvedValue(baseHabit);
      await habitService.create(1, {
        name: "Run",
        description: "",
        frequency: "daily",
        streakThreshold: 50,
      });

      expect(prismaMock.habit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          name: "Run",
          description: null,
          frequency: "daily",
          customFrequency: null,
          streakThreshold: 50,
        }),
      });
    });

    it("stores customFrequency only for custom frequency", async () => {
      prismaMock.habit.create.mockResolvedValue(baseHabit);
      await habitService.create(1, {
        name: "Gym",
        description: "Strength training",
        frequency: "custom",
        customFrequency: "3",
        streakThreshold: 60,
      });

      expect(prismaMock.habit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          frequency: "custom",
          customFrequency: "3",
        }),
      });
    });
  });

  describe("update", () => {
    it("updates fields of an existing habit", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      prismaMock.habit.update.mockResolvedValue({ ...baseHabit, name: "Walk" });

      await habitService.update(1, 1, { name: "Walk" });

      expect(prismaMock.habit.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ name: "Walk" }),
      });
    });

    it("clears customFrequency when switching to non-custom frequency", async () => {
      prismaMock.habit.findUnique.mockResolvedValue({
        ...baseHabit,
        frequency: "custom",
        customFrequency: "3",
      });
      prismaMock.habit.update.mockResolvedValue(baseHabit);

      await habitService.update(1, 1, { frequency: "daily" });

      const updateCall = prismaMock.habit.update.mock.calls[0][0];
      expect(updateCall.data.customFrequency).toBeNull();
    });

    it("throws NOT_FOUND when habit doesn't exist", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(null);
      await expect(habitService.update(99, 1, { name: "X" })).rejects.toThrow(
        "NOT_FOUND",
      );
    });

    it("throws NOT_FOUND when habit belongs to another user", async () => {
      prismaMock.habit.findUnique.mockResolvedValue({
        ...baseHabit,
        userId: 99,
      });
      await expect(habitService.update(1, 1, { name: "X" })).rejects.toThrow(
        "NOT_FOUND",
      );
    });
  });

  describe("delete", () => {
    it("deletes a habit owned by the user", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      prismaMock.habit.delete.mockResolvedValue(baseHabit);

      await habitService.delete(1, 1);

      expect(prismaMock.habit.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("throws NOT_FOUND when habit doesn't exist", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(null);
      await expect(habitService.delete(1, 1)).rejects.toThrow("NOT_FOUND");
    });

    it("throws NOT_FOUND when wrong owner", async () => {
      prismaMock.habit.findUnique.mockResolvedValue({
        ...baseHabit,
        userId: 99,
      });
      await expect(habitService.delete(1, 1)).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("upsertCompletion", () => {
    it("creates or updates a completion and recalculates streak", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      prismaMock.completion.upsert.mockResolvedValue({
        id: 1,
        habitId: 1,
        completionDate: strToUTC("2026-05-22"),
        completionPct: 80,
      });
      prismaMock.completion.findMany.mockResolvedValue([]);
      prismaMock.habit.update.mockResolvedValue(baseHabit);

      const result = await habitService.upsertCompletion(1, 1, 80, "2026-05-22");

      expect(prismaMock.completion.upsert).toHaveBeenCalled();
      expect(result.completionPct).toBe(80);
    });

    it("throws NOT_FOUND for habit that doesn't exist", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(null);
      await expect(habitService.upsertCompletion(1, 1, 50)).rejects.toThrow(
        "NOT_FOUND",
      );
    });

    it("throws NOT_FOUND for habit owned by another user", async () => {
      prismaMock.habit.findUnique.mockResolvedValue({ ...baseHabit, userId: 99 });
      await expect(habitService.upsertCompletion(1, 1, 50)).rejects.toThrow(
        "NOT_FOUND",
      );
    });

    it("throws INVALID_PCT for negative percentage", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      await expect(habitService.upsertCompletion(1, 1, -1)).rejects.toThrow(
        "INVALID_PCT",
      );
    });

    it("throws INVALID_PCT for percentage over 100", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      await expect(habitService.upsertCompletion(1, 1, 101)).rejects.toThrow(
        "INVALID_PCT",
      );
    });
  });

  describe("getCompletions", () => {
    it("returns completions for the habit owner", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      prismaMock.completion.findMany.mockResolvedValue([
        { id: 1, habitId: 1, completionPct: 80, completionDate: new Date() },
      ]);

      const result = await habitService.getCompletions(
        1,
        1,
        new Date(),
        new Date(),
      );

      expect(result).toHaveLength(1);
    });

    it("throws NOT_FOUND for wrong owner", async () => {
      prismaMock.habit.findUnique.mockResolvedValue({ ...baseHabit, userId: 99 });
      await expect(
        habitService.getCompletions(1, 1, new Date(), new Date()),
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("recalculateStreak", () => {
    it("does nothing if habit doesn't exist", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(null);
      await habitService.recalculateStreak(1);
      expect(prismaMock.habit.update).not.toHaveBeenCalled();
    });

    it("sets streak to 0 when there are no completions", async () => {
      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      prismaMock.completion.findMany.mockResolvedValue([]);
      prismaMock.habit.update.mockResolvedValue(baseHabit);

      await habitService.recalculateStreak(1);

      expect(prismaMock.habit.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { currentStreak: 0 },
      });
    });

    it("daily: counts consecutive days meeting threshold", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      prismaMock.completion.findMany.mockResolvedValue([
        { completionDate: today, completionPct: 80 },
        { completionDate: yesterday, completionPct: 70 },
      ]);
      prismaMock.habit.update.mockResolvedValue(baseHabit);

      await habitService.recalculateStreak(1);

      const updateCall = prismaMock.habit.update.mock.calls[0][0];
      expect(updateCall.data.currentStreak).toBe(2);
    });

    it("daily: breaks streak when most recent completion is older than yesterday", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      prismaMock.completion.findMany.mockResolvedValue([
        { completionDate: threeDaysAgo, completionPct: 80 },
      ]);
      prismaMock.habit.update.mockResolvedValue(baseHabit);

      await habitService.recalculateStreak(1);

      const updateCall = prismaMock.habit.update.mock.calls[0][0];
      expect(updateCall.data.currentStreak).toBe(0);
    });

    it("daily: breaks streak when pct is below threshold", async () => {
      const today = new Date();
      prismaMock.habit.findUnique.mockResolvedValue(baseHabit);
      prismaMock.completion.findMany.mockResolvedValue([
        { completionDate: today, completionPct: 20 }, // below 50 threshold
      ]);
      prismaMock.habit.update.mockResolvedValue(baseHabit);

      await habitService.recalculateStreak(1);

      const updateCall = prismaMock.habit.update.mock.calls[0][0];
      expect(updateCall.data.currentStreak).toBe(0);
    });

    it("weekly: counts a streak across qualifying weeks", async () => {
      const habit = {
        ...baseHabit,
        frequency: "weekly",
      };
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);

      prismaMock.habit.findUnique.mockResolvedValue(habit);
      prismaMock.completion.findMany.mockResolvedValue([
        { completionDate: today, completionPct: 80 },
        { completionDate: oneWeekAgo, completionPct: 70 },
      ]);
      prismaMock.habit.update.mockResolvedValue(habit);

      await habitService.recalculateStreak(1);

      const updateCall = prismaMock.habit.update.mock.calls[0][0];
      expect(updateCall.data.currentStreak).toBeGreaterThanOrEqual(1);
    });

    it("weekly: streak 0 when most recent completion is older than last week", async () => {
      const habit = { ...baseHabit, frequency: "weekly" };
      const longAgo = new Date();
      longAgo.setDate(longAgo.getDate() - 30);

      prismaMock.habit.findUnique.mockResolvedValue(habit);
      prismaMock.completion.findMany.mockResolvedValue([
        { completionDate: longAgo, completionPct: 80 },
      ]);
      prismaMock.habit.update.mockResolvedValue(habit);

      await habitService.recalculateStreak(1);

      const updateCall = prismaMock.habit.update.mock.calls[0][0];
      expect(updateCall.data.currentStreak).toBe(0);
    });

    it("custom (N times/week): streak counts weeks with ≥ N completions ≥ threshold", async () => {
      const habit = {
        ...baseHabit,
        frequency: "custom",
        customFrequency: "2",
      };

      const today = new Date();
      const t = new Date(today);
      const t1 = new Date(today);
      t1.setDate(t1.getDate() - 1);

      prismaMock.habit.findUnique.mockResolvedValue(habit);
      prismaMock.completion.findMany.mockResolvedValue([
        { completionDate: t, completionPct: 80 },
        { completionDate: t1, completionPct: 70 },
      ]);
      prismaMock.habit.update.mockResolvedValue(habit);

      await habitService.recalculateStreak(1);

      const updateCall = prismaMock.habit.update.mock.calls[0][0];
      expect(updateCall.data.currentStreak).toBeGreaterThanOrEqual(1);
    });

  });
});
