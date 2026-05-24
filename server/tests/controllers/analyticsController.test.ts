jest.mock("@/services/analyticsService", () => ({
  analyticsService: {
    getDashboardStats: jest.fn(),
    getChartData: jest.fn(),
    getOverview: jest.fn(),
  },
}));

jest.mock("@/middlewares/authMiddleware", () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: 1, email: "test@test.com" };
    next();
  },
}));

import express from "express";
import request from "supertest";
import analyticsRouter from "@/routes/analytics";
import { analyticsService } from "@/services/analyticsService";

const mockAnalytics = analyticsService as jest.Mocked<typeof analyticsService>;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/analytics", analyticsRouter);
  return app;
}

describe("analyticsController", () => {
  beforeEach(() => {
    Object.values(mockAnalytics).forEach((fn) =>
      (fn as jest.Mock).mockReset(),
    );
  });

  describe("GET /analytics/dashboard", () => {
    it("returns dashboard stats", async () => {
      mockAnalytics.getDashboardStats.mockResolvedValue({
        weekAvgPct: 70,
        activeStreaks: 2,
        bestHabit: { name: "Run", avgPct: 80 },
        worstHabit: { name: "Read", avgPct: 50 },
      } as any);

      const res = await request(makeApp()).get("/analytics/dashboard");

      expect(res.status).toBe(200);
      expect(res.body.data.weekAvgPct).toBe(70);
    });

    it("returns 500 on error", async () => {
      mockAnalytics.getDashboardStats.mockRejectedValue(new Error("boom"));
      const res = await request(makeApp()).get("/analytics/dashboard");
      expect(res.status).toBe(500);
    });
  });

  describe("GET /analytics/chart", () => {
    it("returns chart data with default period 7", async () => {
      mockAnalytics.getChartData.mockResolvedValue([] as any);

      const res = await request(makeApp()).get("/analytics/chart?habitIds=1,2");

      expect(res.status).toBe(200);
      expect(mockAnalytics.getChartData).toHaveBeenCalledWith(1, [1, 2], 7);
    });

    it("returns chart data with explicit period 30", async () => {
      mockAnalytics.getChartData.mockResolvedValue([] as any);
      await request(makeApp()).get("/analytics/chart?habitIds=1&period=30");
      expect(mockAnalytics.getChartData).toHaveBeenCalledWith(1, [1], 30);
    });

    it("rejects invalid period", async () => {
      const res = await request(makeApp()).get(
        "/analytics/chart?period=999",
      );
      expect(res.status).toBe(400);
    });

    it("handles no habitIds gracefully", async () => {
      mockAnalytics.getChartData.mockResolvedValue([] as any);
      const res = await request(makeApp()).get("/analytics/chart");
      expect(res.status).toBe(200);
      expect(mockAnalytics.getChartData).toHaveBeenCalledWith(1, [], 7);
    });

    it("returns 500 on service error", async () => {
      mockAnalytics.getChartData.mockRejectedValue(new Error("boom"));
      const res = await request(makeApp()).get(
        "/analytics/chart?habitIds=1",
      );
      expect(res.status).toBe(500);
    });
  });

  describe("GET /analytics/overview", () => {
    it("returns overview with default period 30", async () => {
      mockAnalytics.getOverview.mockResolvedValue({
        points: [],
        dayAvgs: [0, 0, 0, 0, 0, 0, 0],
        bestDay: "Monday",
        bestDayIdx: 1,
      } as any);

      const res = await request(makeApp()).get("/analytics/overview");
      expect(res.status).toBe(200);
      expect(mockAnalytics.getOverview).toHaveBeenCalledWith(1, 30);
    });

    it("returns overview with explicit period", async () => {
      mockAnalytics.getOverview.mockResolvedValue({} as any);
      await request(makeApp()).get("/analytics/overview?period=365");
      expect(mockAnalytics.getOverview).toHaveBeenCalledWith(1, 365);
    });

    it("returns 500 on error", async () => {
      mockAnalytics.getOverview.mockRejectedValue(new Error("boom"));
      const res = await request(makeApp()).get("/analytics/overview");
      expect(res.status).toBe(500);
    });
  });
});
