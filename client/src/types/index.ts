// ─── Entities ─────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  createdAt: string;
}

export interface Habit {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  frequency: "daily" | "weekly" | "custom";
  streakThreshold: number; // поріг (%) при якому день зараховується у серію
  currentStreak: number;
  maxStreak: number;
  createdAt: string;
  // ці поля не в БД — розраховуються сервером при відповіді
  todayPct: number | null; // completion_pct за сьогодні (null = не зафіксовано)
  weekAvgPct: number | null; // середній pct за останні 7 днів
  customFrequency?: string | null;
}

export interface Completion {
  id: number;
  habitId: number;
  completionDate: string; // формат "YYYY-MM-DD"
  completionPct: number; // 0–100
  createdAt: string;
}

export interface Recommendation {
  id: number;
  userId: number;
  habitId: number | null;
  content: string;
  generatedAt: string;
  isRead: boolean;
}

// ─── API responses ─────────────────────────────────────────────────────────────

// Generic обгортка — всі відповіді API матимуть однаковий формат
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code: number;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthPayload {
  userId: number;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  weekAvgPct: number;
  activeStreaks: number; // кількість звичок з поточною серією > 0
  bestHabit: { name: string; avgPct: number } | null;
  worstHabit: { name: string; avgPct: number } | null;
}

export interface ChartDataPoint {
  date: string; // "YYYY-MM-DD"
  avgPct: number; // середній pct за цей день
}

export interface ChartData {
  habitId: number;
  habitName: string;
  points: ChartDataPoint[];
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export interface HabitFormData {
  name: string;
  description: string;
  frequency: "daily" | "weekly" | "custom";
  customFrequency?: string;
  streakThreshold: number;
}

export interface OverviewPoint {
  date: string;
  avgPct: number;
  completedCount: number;
}

export interface OverviewData {
  points: OverviewPoint[];
  dayAvgs: number[];
  bestDay: string;
  bestDayIdx: number;
}
