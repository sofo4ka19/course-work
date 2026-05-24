import { prismaMock, resetPrismaMock } from "../__mocks__/prismaMock";

// Mock the Google GenAI SDK so we never hit the network
const mockGenerateContent = jest.fn();
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

import { recommendationService } from "@/services/recommendationService";

const habitWithCompletions = (
  overrides: Partial<{
    id: number;
    name: string;
    currentStreak: number;
    maxStreak: number;
    streakThreshold: number;
    pcts: number[];
  }> = {},
) => {
  const id = overrides.id ?? 1;
  const pcts = overrides.pcts ?? [80, 70, 90, 60, 80];
  const completions = pcts.map((pct, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (pcts.length - i));
    return { completionDate: d, completionPct: pct };
  });
  return {
    id,
    name: overrides.name ?? "Run",
    currentStreak: overrides.currentStreak ?? 3,
    maxStreak: overrides.maxStreak ?? 5,
    streakThreshold: overrides.streakThreshold ?? 50,
    completions,
  };
};

describe("recommendationService", () => {
  beforeEach(() => {
    resetPrismaMock();
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = "fake-key-for-tests";
  });

  describe("generate", () => {
    it("returns 0 when user has no habits", async () => {
      prismaMock.habit.findMany.mockResolvedValue([]);
      const count = await recommendationService.generate(1);
      expect(count).toBe(0);
      expect(prismaMock.recommendation.create).not.toHaveBeenCalled();
    });

    it("uses Gemini response when available", async () => {
      prismaMock.habit.findMany.mockResolvedValue([habitWithCompletions()]);
      prismaMock.recommendation.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.recommendation.create.mockResolvedValue({});

      mockGenerateContent.mockResolvedValue({
        text: `1. Keep up the great work on your Run habit
2. Try logging earlier on Mondays
3. Add a buddy to stay accountable`,
      });

      const count = await recommendationService.generate(1);

      expect(count).toBeGreaterThanOrEqual(3);
      expect(prismaMock.recommendation.create).toHaveBeenCalled();
    });

    it("falls back to rule-based when Gemini throws", async () => {
      prismaMock.habit.findMany.mockResolvedValue([habitWithCompletions()]);
      prismaMock.recommendation.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.recommendation.create.mockResolvedValue({});

      mockGenerateContent.mockRejectedValue(new Error("API quota exceeded"));

      const count = await recommendationService.generate(1);

      expect(count).toBeGreaterThan(0);
      expect(prismaMock.recommendation.create).toHaveBeenCalled();
    });

    it("falls back when Gemini returns empty/unparseable text", async () => {
      prismaMock.habit.findMany.mockResolvedValue([habitWithCompletions()]);
      prismaMock.recommendation.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.recommendation.create.mockResolvedValue({});

      mockGenerateContent.mockResolvedValue({ text: "" });

      const count = await recommendationService.generate(1);
      // rule-based fallback should still produce text(s)
      expect(count).toBeGreaterThan(0);
    });

    it("falls back when GEMINI_API_KEY is missing", async () => {
      delete process.env.GEMINI_API_KEY;
      prismaMock.habit.findMany.mockResolvedValue([habitWithCompletions()]);
      prismaMock.recommendation.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.recommendation.create.mockResolvedValue({});

      const count = await recommendationService.generate(1);
      expect(count).toBeGreaterThan(0);
    });

    it("strips markdown asterisks and intro lines from Gemini output", async () => {
      prismaMock.habit.findMany.mockResolvedValue([habitWithCompletions()]);
      prismaMock.recommendation.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.recommendation.create.mockResolvedValue({});

      mockGenerateContent.mockResolvedValue({
        text: `Here are 3 personalized recommendations:
1. **Bold** advice for your Run habit — keep going!
2. *Italic* tip about morning timing for better completion rates
3. Plain advice with no markdown about your tracking`,
      });

      await recommendationService.generate(1);

      const calls = prismaMock.recommendation.create.mock.calls;
      const savedContents = calls.map((c: any) => c[0].data.content);
      for (const c of savedContents) {
        expect(c).not.toContain("**");
        expect(c).not.toContain("*");
        expect(c).not.toMatch(/^Here are/);
      }
    });

    it("archives old unread recommendations before creating new ones", async () => {
      prismaMock.habit.findMany.mockResolvedValue([habitWithCompletions()]);
      prismaMock.recommendation.updateMany.mockResolvedValue({ count: 2 });
      prismaMock.recommendation.create.mockResolvedValue({});

      mockGenerateContent.mockResolvedValue({
        text: `1. First recommendation here that is long enough\n2. Second recommendation that is also long`,
      });

      await recommendationService.generate(1);

      expect(prismaMock.recommendation.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, isRead: false },
        data: { isRead: true },
      });
    });

  });

  // ── applyRules: 6 explicit rule cases ─────────────────────────
  // applyRules is internal — we exercise it by forcing Gemini to fail so the
  // service falls back to ruleToText(rule) and saves the rule outputs directly.
  describe("applyRules", () => {
    beforeEach(() => {
      prismaMock.recommendation.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.recommendation.create.mockResolvedValue({});
      mockGenerateContent.mockRejectedValue(new Error("force rule fallback"));
    });

    function savedContents(): string {
      return prismaMock.recommendation.create.mock.calls
        .map((c: any) => c[0].data.content)
        .join(" ");
    }

    it("low_avg: fires when 30-day avg < 45 and ≥ 5 entries", async () => {
      prismaMock.habit.findMany.mockResolvedValue([
        habitWithCompletions({
          name: "Run",
          pcts: [20, 30, 25, 30, 20, 25, 30],
          currentStreak: 0,
        }),
      ]);

      await recommendationService.generate(1);

      expect(savedContents()).toMatch(/Run/);
      expect(savedContents().toLowerCase()).toMatch(/lower|threshold|achievable/);
    });

    it("declining_streak: fires when current streak ≥ 3 and trend < -15", async () => {
      // first-half high pct, second-half low pct → trend strongly negative
      prismaMock.habit.findMany.mockResolvedValue([
        habitWithCompletions({
          name: "Read",
          currentStreak: 5,
          pcts: [90, 90, 90, 90, 90, 30, 30, 30, 30, 30],
        }),
      ]);

      await recommendationService.generate(1);

      expect(savedContents()).toMatch(/Read/);
      expect(savedContents().toLowerCase()).toMatch(/declin|down|streak/);
    });

    it("weak_day: fires when one day-of-week avg is ≥ 25pp below overall", async () => {
      // craft completions so one weekday is consistently far below others
      const habit = {
        id: 1,
        name: "Walk",
        currentStreak: 0,
        maxStreak: 0,
        streakThreshold: 50,
        completions: [] as any[],
      };
      const today = new Date();
      // 14 days of mostly-high pct, but one specific weekday gets very low
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        habit.completions.push({
          completionDate: d,
          completionPct: d.getDay() === today.getDay() ? 10 : 90,
        });
      }
      prismaMock.habit.findMany.mockResolvedValue([habit] as any);

      await recommendationService.generate(1);

      expect(savedContents()).toMatch(/Walk/);
    });

    it("record_streak: fires when currentStreak === maxStreak ≥ 7", async () => {
      prismaMock.habit.findMany.mockResolvedValue([
        habitWithCompletions({
          name: "Meditation",
          currentStreak: 10,
          maxStreak: 10,
          pcts: [80, 90, 85, 90, 88],
        }),
      ]);

      await recommendationService.generate(1);

      expect(savedContents()).toMatch(/Meditation|streak|record/i);
    });

    it("too_many_habits: fires when 3+ habits and overall avg < 55", async () => {
      prismaMock.habit.findMany.mockResolvedValue([
        habitWithCompletions({ id: 1, name: "A", pcts: [40, 45, 40, 45, 40] }),
        habitWithCompletions({ id: 2, name: "B", pcts: [40, 45, 40, 45, 40] }),
        habitWithCompletions({ id: 3, name: "C", pcts: [40, 45, 40, 45, 40] }),
      ]);

      await recommendationService.generate(1);

      expect(savedContents().toLowerCase()).toMatch(/2.3 habits|focus|pausing|priority/);
    });

    it("general_progress: fires as fallback when no other rule matches", async () => {
      prismaMock.habit.findMany.mockResolvedValue([
        habitWithCompletions({
          name: "Sleep",
          pcts: [60, 65, 70],
          currentStreak: 1,
          maxStreak: 2,
        }),
      ]);

      const count = await recommendationService.generate(1);
      expect(count).toBeGreaterThan(0);
      expect(savedContents()).toMatch(/Sleep|tracking|average/i);
    });
  });

  describe("generateIfNeeded", () => {
    it("returns 0 when a recommendation was already generated today", async () => {
      prismaMock.recommendation.findFirst.mockResolvedValue({
        id: 1,
        generatedAt: new Date(),
      });

      const count = await recommendationService.generateIfNeeded(1);

      expect(count).toBe(0);
      expect(prismaMock.habit.findMany).not.toHaveBeenCalled();
    });

    it("calls generate when no today's recommendation exists", async () => {
      prismaMock.recommendation.findFirst.mockResolvedValue(null);
      prismaMock.habit.findMany.mockResolvedValue([]);
      // generate will short-circuit because no habits

      const count = await recommendationService.generateIfNeeded(1);
      expect(count).toBe(0);
      expect(prismaMock.habit.findMany).toHaveBeenCalled();
    });
  });
});
