export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

// Останні N днів як масив рядків
export function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => daysAgoStr(n - 1 - i));
}
