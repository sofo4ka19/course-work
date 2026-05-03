import apiClient from "./apiClient";
import type { Recommendation } from "@/types";

export const recommendationsApi = {
  getAll: () => apiClient.get<{ data: Recommendation[] }>("/recommendations"),

  markRead: (id: number) => apiClient.patch(`/recommendations/${id}/read`),

  generate: () =>
    apiClient.post<{ data: { generated: number } }>(
      "/recommendations/generate",
    ),
};
