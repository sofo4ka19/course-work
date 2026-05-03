import { useState, useEffect, useCallback, type ReactNode } from "react";
import type { Habit, HabitFormData } from "@/types";
import { habitsApi } from "@/api/habitsApi";
import { HabitContext } from "./habitContext";

export function HabitProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await habitsApi.getAll();
      setHabits(res.data.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const createHabit = async (data: HabitFormData) => {
    const res = await habitsApi.create(data);
    // Додаємо нову звичку локально — не робимо зайвий fetch
    setHabits((prev) => [
      ...prev,
      {
        ...res.data.data,
        todayPct: null,
        weekAvgPct: null,
      },
    ]);
  };

  const updateHabit = async (id: number, data: Partial<HabitFormData>) => {
    const res = await habitsApi.update(id, data);
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...res.data.data } : h)),
    );
  };

  const deleteHabit = async (id: number) => {
    await habitsApi.delete(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const logCompletion = async (habitId: number, pct: number) => {
    await habitsApi.upsertCompletion(habitId, pct);
    // Після фіксації — оновлюємо тільки цю звичку
    // (серія перерахована на сервері, потрібні свіжі дані)
    const res = await habitsApi.getAll();
    setHabits(res.data.data);
  };

  return (
    <HabitContext.Provider
      value={{
        habits,
        isLoading,
        fetchHabits,
        createHabit,
        updateHabit,
        deleteHabit,
        logCompletion,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}
