import apiClient from "./apiClient";
import type { Habit, Completion, HabitFormData } from "@/types";

export const habitsApi = {
  getAll: () => apiClient.get<{ data: Habit[] }>("/habits"),

  create: (data: HabitFormData) =>
    apiClient.post<{ data: Habit }>("/habits", data),

  update: (id: number, data: Partial<HabitFormData>) =>
    apiClient.put<{ data: Habit }>(`/habits/${id}`, data),

  delete: (id: number) => apiClient.delete(`/habits/${id}`),

  upsertCompletion: (habitId: number, completionPct: number, date?: string) =>
    apiClient.post<{ data: Completion }>(`/habits/${habitId}/completions`, {
      completionPct,
      ...(date && { date }),
    }),

  getCompletions: (habitId: number, from?: string, to?: string) =>
    apiClient.get<{ data: Completion[] }>(`/habits/${habitId}/completions`, {
      params: { from, to },
    }),
};
