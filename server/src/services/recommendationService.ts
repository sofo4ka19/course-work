import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  localDateStr,
  strToUTC,
  strToUTCEnd,
  daysAgoStr,
  strToLocal,
} from "@/utils/date";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface HabitStats {
  habitId: number;
  habitName: string;
  avgPct: number;
  recentPcts: number[];
  currentStreak: number;
  maxStreak: number;
  streakThreshold: number;
  dayOfWeekAvg: number[]; // індекс 0=нд..6=сб, -1 = немає даних
  trend: number; // різниця між першою і другою половиною period
}

// ── Аналіз даних ─────────────────────────────────────────────────

async function analyzeHabits(userId: number): Promise<HabitStats[]> {
  const from = strToUTC(daysAgoStr(30));
  const to = strToUTCEnd(localDateStr());

  const habits = await prisma.habit.findMany({
    where: { userId },
    include: {
      completions: {
        where: { completionDate: { gte: from, lte: to } },
        orderBy: { completionDate: "asc" },
      },
    },
  });

  return habits.map((habit) => {
    const pcts = habit.completions.map((c) => c.completionPct);
    const avgPct =
      pcts.length > 0
        ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
        : 0;

    const dayBuckets: number[][] = Array.from({ length: 7 }, () => []);
    habit.completions.forEach((c) => {
      const day = strToLocal(localDateStr(c.completionDate)).getDay();
      dayBuckets[day]!.push(c.completionPct);
    });
    const dayOfWeekAvg = dayBuckets.map((b) =>
      b.length > 0 ? Math.round(b.reduce((a, x) => a + x, 0) / b.length) : -1,
    );

    const half = Math.floor(pcts.length / 2);
    const first =
      half > 0 ? pcts.slice(0, half).reduce((a, b) => a + b, 0) / half : 0;
    const last =
      half > 0 ? pcts.slice(-half).reduce((a, b) => a + b, 0) / half : 0;
    const trend = Math.round(last - first);

    return {
      habitId: habit.id,
      habitName: habit.name,
      avgPct,
      recentPcts: pcts,
      currentStreak: habit.currentStreak,
      maxStreak: habit.maxStreak,
      streakThreshold: habit.streakThreshold,
      dayOfWeekAvg,
      trend,
    };
  });
}

// ── Rule-based: визначаємо що сказати ────────────────────────────

interface RuleResult {
  habitId: number | null;
  type: string;
  data: Record<string, unknown>;
}

function applyRules(stats: HabitStats[]): RuleResult[] {
  const results: RuleResult[] = [];

  for (const s of stats) {
    // Правило 1: низький avg
    if (s.avgPct < 45 && s.recentPcts.length >= 5) {
      results.push({
        habitId: s.habitId,
        type: "low_avg",
        data: {
          name: s.habitName,
          avg: s.avgPct,
          threshold: s.streakThreshold,
        },
      });
    }

    // Правило 2: ризик переривання серії (спадний тренд)
    if (s.currentStreak >= 3 && s.trend < -15) {
      results.push({
        habitId: s.habitId,
        type: "declining_streak",
        data: {
          name: s.habitName,
          streak: s.currentStreak,
          trend: Math.abs(s.trend),
        },
      });
    }

    // Правило 3: слабкий день тижня
    const validDays = s.dayOfWeekAvg
      .map((avg, i) => ({ avg, i }))
      .filter((d) => d.avg >= 0);

    if (validDays.length >= 3) {
      const weakest = validDays.sort((a, b) => a.avg - b.avg)[0];
      if (weakest && weakest.avg < s.avgPct - 25) {
        results.push({
          habitId: s.habitId,
          type: "weak_day",
          data: {
            name: s.habitName,
            day: DAY_NAMES[weakest.i],
            dayAvg: weakest.avg,
            overall: s.avgPct,
          },
        });
      }
    }

    // Правило 4: рекордна серія
    if (
      s.currentStreak > 0 &&
      s.currentStreak === s.maxStreak &&
      s.maxStreak >= 7
    ) {
      results.push({
        habitId: s.habitId,
        type: "record_streak",
        data: { name: s.habitName, streak: s.currentStreak },
      });
    }

    // Правило 5: позитивний тренд
    if (s.trend > 15 && s.avgPct > 50) {
      results.push({
        habitId: s.habitId,
        type: "improving",
        data: { name: s.habitName, trend: s.trend },
      });
    }
  }

  // Правило 6: загальний avg низький при багатьох звичках
  const overallAvg =
    stats.length > 0
      ? Math.round(stats.reduce((s, h) => s + h.avgPct, 0) / stats.length)
      : 0;

  if (overallAvg < 55 && stats.length >= 3) {
    results.push({
      habitId: null,
      type: "too_many_habits",
      data: { count: stats.length, avg: overallAvg },
    });
  }

  return results;
}

// ── Rule-based текстові шаблони (fallback) ────────────────────────

function ruleToText(rule: RuleResult): string {
  const d = rule.data;
  switch (rule.type) {
    case "low_avg":
      return `Your "${d.name}" habit averages only ${d.avg}% over the last 30 days. Consider lowering your streak threshold (currently ${d.threshold}%) to make it more achievable and build momentum first.`;
    case "declining_streak":
      return `"${d.name}" shows a declining trend — down ${d.trend}% over recent days. You're on a ${d.streak}-day streak, so try to hit your threshold today to keep it alive.`;
    case "weak_day":
      return `${d.day}s are consistently your weakest day for "${d.name}" (${d.dayAvg}% vs your ${d.overall}% average). Try scheduling it earlier on ${d.day}s or pairing it with an existing routine.`;
    case "record_streak":
      return `You're on your longest ever streak for "${d.name}" — ${d.streak} days in a row! Consider raising your threshold slightly to keep challenging yourself.`;
    case "improving":
      return `"${d.name}" is on an upward trend (+${d.trend}% over the past 2 weeks). Great momentum — keep it going!`;
    case "too_many_habits":
      return `Your overall average across ${d.count} habits is ${d.avg}%. Research suggests focusing on 2–3 habits at a time is more effective. Consider pausing lower-priority habits temporarily.`;
    default:
      return "";
  }
}

// ── Gemini генерація ──────────────────────────────────────────────

async function generateWithGemini(
  rules: RuleResult[],
  stats: HabitStats[],
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("NO_GEMINI_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const statsContext = stats
    .map(
      (s) =>
        `- "${s.habitName}": avg ${s.avgPct}%, streak ${s.currentStreak}d` +
        ` (max ${s.maxStreak}d), threshold ${s.streakThreshold}%` +
        `, trend ${s.trend > 0 ? "+" : ""}${s.trend}%` +
        `, weakest day: ${s.dayOfWeekAvg.map((v, i) => `${DAY_NAMES[i]!.slice(0, 3)}=${v >= 0 ? v + "%" : "n/a"}`).join(" ")}`,
    )
    .join("\n");

  const rulesContext = rules
    .map((r) => `[${r.type}] ${JSON.stringify(r.data)}`)
    .join("\n");

  const prompt = `You are a helpful habit coach. Based on the user's habit data and identified patterns, write ${rules.length} specific, actionable recommendations.

USER HABIT DATA (last 30 days):
${statsContext}

IDENTIFIED PATTERNS:
${rulesContext}

Write exactly ${rules.length} recommendations, one per line, numbered 1. 2. 3. etc.
- Be specific and encouraging, mention habit names
- Each recommendation should be 1-2 sentences max
- Focus on actionable advice
- Do not use markdown formatting`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Парсимо нумерований список
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter((l) => l.length > 10);

  return lines;
}

// ── Головна функція ───────────────────────────────────────────────

export const recommendationService = {
  async generate(userId: number): Promise<number> {
    const stats = await analyzeHabits(userId);
    if (stats.length === 0) return 0;

    const rules = applyRules(stats);
    if (rules.length === 0) return 0;

    let texts: string[];

    try {
      texts = await generateWithGemini(rules, stats);
      // Якщо Gemini повернув менше рядків ніж правил — доповнюємо fallback
      while (texts.length < rules.length) {
        const rule = rules[texts.length];
        if (rule) texts.push(ruleToText(rule));
      }
    } catch (err) {
      console.warn(
        "[recommendations] Gemini unavailable, using rule-based fallback:",
        err,
      );
      texts = rules.map(ruleToText).filter(Boolean);
    }

    // Видаляємо старі непрочитані і зберігаємо нові
    await prisma.recommendation.deleteMany({
      where: { userId, isRead: false },
    });

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule) continue;
      const text = texts[i] || ruleToText(rule);
      if (!text) continue;
      await prisma.recommendation.create({
        data: {
          userId,
          habitId: rule.habitId,
          content: text,
        },
      });
    }

    return rules.length;
  },
};
