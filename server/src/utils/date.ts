/** "YYYY-MM-DD" у локальному часі — ніколи не використовуємо toISOString() */
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Рядок "YYYY-MM-DD" → Date опівночі UTC для Prisma */
export function strToUTC(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** Кінець дня UTC для діапазонів lte */
export function strToUTCEnd(s: string): Date {
  return new Date(`${s}T23:59:59.999Z`);
}

/** N днів тому як рядок */
export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

/** ISO номер тижня "YYYY-Www" */
export function isoWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - jan4.getTime()) / 86400000 -
        3 +
        ((jan4.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Попередній ISO тиждень */
export function prevIsoWeek(week: string): string {
  const parts = week.split("-W");
  if (parts.length !== 2) throw new Error(`Invalid ISO week format: ${week}`);
  const year = Number(parts[0]);
  const wn = Number(parts[1]);
  if (isNaN(year) || isNaN(wn))
    throw new Error(`Invalid ISO week format: ${week}`);
  const d = new Date(Date.UTC(year, 0, 1 + (wn - 2) * 7));
  return isoWeek(d);
}
