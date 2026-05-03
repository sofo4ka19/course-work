import apiClient from "./apiClient";
import type { DashboardStats, ChartData } from "@/types";

export const analyticsApi = {
  getDashboard: () =>
    apiClient.get<{ data: DashboardStats }>("/analytics/dashboard"),

  getChart: (habitIds: number[], period: 7 | 30 | 90) =>
    apiClient.get<{ data: ChartData[] }>("/analytics/chart", {
      params: { habitIds: habitIds.join(","), period },
    }),
};
