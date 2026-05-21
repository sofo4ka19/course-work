import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
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
  recentEntries: { date: string; pct: number }[]; // last 14 logged days
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

    const recentEntries = habit.completions.slice(-14).map((c) => ({
      date: localDateStr(c.completionDate),
      pct: c.completionPct,
    }));

    return {
      habitId: habit.id,
      habitName: habit.name,
      avgPct,
      recentPcts: pcts,
      recentEntries,
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

  // Fallback: якщо жодне правило не спрацювало — загальний огляд
  if (results.length === 0) {
    const best = [...stats].sort((a, b) => b.avgPct - a.avgPct)[0];
    results.push({
      habitId: best?.habitId ?? null,
      type: "general_progress",
      data: {
        count: stats.length,
        avg: overallAvg,
        best: best?.habitName ?? "",
        bestAvg: best?.avgPct ?? 0,
      },
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
    case "general_progress":
      return `You're tracking ${d.count} habit${Number(d.count) === 1 ? "" : "s"} with an overall average of ${d.avg}%. "${d.best}" is your strongest at ${d.bestAvg}%. Keep logging daily to build streaks and unlock more personalized advice.`;
    default:
      return "";
  }
}

// ── Gemini генерація ──────────────────────────────────────────────

async function generateWithGemini(
  stats: HabitStats[],
  rules: RuleResult[],
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("NO_GEMINI_KEY");

  const ai = new GoogleGenAI({ apiKey });

  const statsContext = stats
    .map((s) => {
      const byDay = DAY_NAMES.map((d, i) =>
        s.dayOfWeekAvg[i]! >= 0
          ? `${d.slice(0, 3)}: ${s.dayOfWeekAvg[i]}%`
          : null,
      )
        .filter(Boolean)
        .join(", ");
      const recent = s.recentEntries
        .map((e) => `${e.date}: ${e.pct}%`)
        .join(", ");
      return (
        `Habit: "${s.habitName}"\n` +
        `  30-day avg: ${s.avgPct}%  |  threshold: ${s.streakThreshold}%\n` +
        `  streak: ${s.currentStreak}d current, ${s.maxStreak}d best\n` +
        `  trend (recent vs earlier): ${s.trend > 0 ? "+" : ""}${s.trend}%\n` +
        (byDay ? `  by day of week: ${byDay}\n` : "") +
        (recent ? `  last logged days: ${recent}\n` : "")
      );
    })
    .join("\n");

  const hintsContext =
    rules.length > 0
      ? `\nPATTERNS DETECTED (use as hints, not constraints):\n${rules.map((r) => `- [${r.type}] ${JSON.stringify(r.data)}`).join("\n")}`
      : "";

  const targetCount = Math.min(Math.max(stats.length + 1, 3), 5);

  const prompt = `You are a habit coach. You give honest, direct advice — no hype, no cheerleading. You speak like a knowledgeable friend, not a motivational poster.

Write exactly ${targetCount} recommendations based on the habit data below.

HABIT DATA:
${statsContext}${hintsContext}

Rules:
- Start the response immediately with "1." — no intro sentence, no header, no outro
- Use plain text only: no asterisks, no bold, no markdown of any kind
- Reference exact habit names, percentages, and day names from the data
- For each struggling habit, give one concrete life-hack from your knowledge of that habit domain:
  * Water → keep a bottle visible on your desk, add lemon/mint, drink a glass right after waking
  * Exercise → lay out clothes the night before, start with just 5 minutes, pair with a morning cue
  * Meditation → attach it to teeth-brushing, use a timer not an app, start at 2 minutes
  * Reading → keep the book on your pillow, replace one scroll session, commit to 1 page only
  * Sleep → set a wind-down alarm 30 min before bed, cool the room, no screens after that alarm
  * Journaling → leave the journal on your keyboard, write 3 bullets max, do it right after coffee
  (Apply the same specificity to any habit not listed here)
- Tone: realistic, specific, no vague praise — point out what's actually slipping and why it matters
- Each item: 1–2 sentences max

Output format — exactly this, nothing before or after:
1. ...
2. ...`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text ?? "";
  return text
    .split("\n")
    .filter((l) => /^\d+\./.test(l.trim()))   // only numbered lines
    .map((l) =>
      l
        .replace(/^\d+\.\s*/, "")             // strip leading number
        .replace(/\*\*/g, "")                 // strip bold markdown
        .replace(/\*/g, "")                   // strip italic markdown
        .trim(),
    )
    .filter((l) => l.length > 15);
}
// ── Головна функція ───────────────────────────────────────────────

export const recommendationService = {
  async generate(userId: number): Promise<number> {
    const stats = await analyzeHabits(userId);
    if (stats.length === 0) return 0;

    const rules = applyRules(stats);

    let texts: string[];

    try {
      texts = await generateWithGemini(stats, rules);
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

    for (const text of texts) {
      if (!text) continue;
      await prisma.recommendation.create({
        data: { userId, habitId: null, content: text },
      });
    }

    return texts.length;
  },
};
