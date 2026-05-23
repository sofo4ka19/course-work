import apiClient from "./apiClient";
import type { Recommendation } from "@/types";

export const recommendationsApi = {
  getAll: () => apiClient.get<{ data: Recommendation[] }>("/recommendations"),

  markRead: (id: number) => apiClient.patch(`/recommendations/${id}/read`),

  markAllRead: () => apiClient.patch("/recommendations/read-all"),

  getUnreadCount: () =>
    apiClient.get<{ data: { count: number } }>("/recommendations/unread-count"),

  generate: () =>
    apiClient.post<{ data: { generated: number } }>(
      "/recommendations/generate",
    ),

  autoGenerate: () =>
    apiClient.post<{ data: { generated: number } }>(
      "/recommendations/auto-generate",
    ),
};
