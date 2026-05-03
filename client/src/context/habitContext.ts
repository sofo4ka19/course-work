import { createContext } from "react";
import type { Habit, HabitFormData } from "@/types";

interface HabitContextType {
  habits: Habit[];
  isLoading: boolean;
  fetchHabits: () => Promise<void>;
  createHabit: (data: HabitFormData) => Promise<void>;
  updateHabit: (id: number, data: Partial<HabitFormData>) => Promise<void>;
  deleteHabit: (id: number) => Promise<void>;
  logCompletion: (habitId: number, pct: number, date?: string) => Promise<void>;
}

export const HabitContext = createContext<HabitContextType | null>(null);
