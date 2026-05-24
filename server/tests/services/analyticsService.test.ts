import { prismaMock, resetPrismaMock } from "../__mocks__/prismaMock";
import { analyticsService } from "@/services/analyticsService";

describe("analyticsService", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe("getDashboardStats", () => {
    it("returns zeros and nulls when user has no habits", async () => {
      prismaMock.habit.findMany.mockResolvedValue([]);

      const result = await analyticsService.getDashboardStats(1);

      expect(result).toEqual({
        weekAvgPct: 0,
        activeStreaks: 0,
        bestHabit: null,
        worstHabit: null,
      });
    });

    it("computes weekAvgPct and activeStreaks", async () => {
      prismaMock.habit.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Run",
          currentStreak: 3,
          completions: [{ completionPct: 80 }, { completionPct: 60 }],
        },
        {
          id: 2,
          name: "Read",
          currentStreak: 0,
          completions: [{ completionPct: 40 }],
        },
      ]);

      const result = await analyticsService.getDashboardStats(1);

      // habit 1 avg = 70, habit 2 avg = 40, overall = 55
      expect(result.weekAvgPct).toBe(55);
      expect(result.activeStreaks).toBe(1);
      expect(result.bestHabit).toEqual({ name: "Run", avgPct: 70 });
      expect(result.worstHabit).toEqual({ name: "Read", avgPct: 40 });
    });

    it("handles habits with no completions (avg = 0)", async () => {
      prismaMock.habit.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Run",
          currentStreak: 0,
          completions: [],
        },
      ]);

      const result = await analyticsService.getDashboardStats(1);
      expect(result.weekAvgPct).toBe(0);
      // bestHabit is null because avgPct must be > 0
      expect(result.bestHabit).toBeNull();
    });

    it("returns null bestHabit when all habits have 0 avg", async () => {
      prismaMock.habit.findMany.mockResolvedValue([
        { id: 1, name: "A", currentStreak: 0, completions: [] },
        { id: 2, name: "B", currentStreak: 0, completions: [] },
      ]);

      const result = await analyticsService.getDashboardStats(1);
      expect(result.bestHabit).toBeNull();
    });

    it("does not return same habit as both best and worst when only one habit", async () => {
      prismaMock.habit.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Solo",
          currentStreak: 1,
          completions: [{ completionPct: 100 }],
        },
      ]);

      const result = await analyticsService.getDashboardStats(1);
      expect(result.bestHabit).toEqual({ name: "Solo", avgPct: 100 });
      expect(result.worstHabit).toBeNull();
    });
  });

  describe("getChartData", () => {
    it("returns chart data for the given habits", async () => {
      prismaMock.habit.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Run",
          completions: [
            { completionDate: new Date("2026-05-20"), completionPct: 80 },
            { completionDate: new Date("2026-05-21"), completionPct: 60 },
          ],
        },
      ]);

      const result = await analyticsService.getChartData(1, [1], 7);

      expect(result).toHaveLength(1);
      expect(result[0]!.habitId).toBe(1);
      expect(result[0]!.habitName).toBe("Run");
      expect(result[0]!.points).toHaveLength(2);
      expect(result[0]!.points[0]!.avgPct).toBe(80);
    });

    it("returns empty array when no habits match", async () => {
      prismaMock.habit.findMany.mockResolvedValue([]);
      const result = await analyticsService.getChartData(1, [999], 7);
      expect(result).toEqual([]);
    });
  });

  describe("getOverview", () => {
    it("groups completions by date and computes averages", async () => {
      prismaMock.completion.findMany.mockResolvedValue([
        {
          completionDate: new Date("2026-05-20"),
          completionPct: 80,
          habit: { name: "Run" },
        },
        {
          completionDate: new Date("2026-05-20"),
          completionPct: 60,
          habit: { name: "Read" },
        },
        {
          completionDate: new Date("2026-05-21"),
          completionPct: 40,
          habit: { name: "Run" },
        },
      ]);

      const result = await analyticsService.getOverview(1, 30);

      expect(result.points).toHaveLength(2);
      // May 20 has two completions: 80 + 60 / 2 = 70
      const may20 = result.points.find((p) => p.date === "2026-05-20");
      expect(may20!.avgPct).toBe(70);
      expect(may20!.completedCount).toBe(2);
      // 7 day buckets
      expect(result.dayAvgs).toHaveLength(7);
      expect(result.bestDay).toMatch(
        /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/,
      );
    });

    it("handles empty completions", async () => {
      prismaMock.completion.findMany.mockResolvedValue([]);

      const result = await analyticsService.getOverview(1, 30);

      expect(result.points).toEqual([]);
      expect(result.dayAvgs).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(result.bestDayIdx).toBe(0);
    });
  });
});
