import { Response } from "express";
import { query, validationResult } from "express-validator";
import { AuthRequest } from "@/types";
import { analyticsService } from "@/services/analyticsService";

export const analyticsController = {
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const stats = await analyticsService.getDashboardStats(req.user!.userId);
      res.json({ data: stats });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getChart(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
      return;
    }

    try {
      // habitIds може прийти як "1,2,3" або як масив query params
      const rawIds = req.query.habitIds as string;
      const habitIds = rawIds
        ? rawIds.split(",").map(Number).filter(Boolean)
        : [];

      const period = Number(req.query.period ?? 7) as 7 | 30 | 90;

      const data = await analyticsService.getChartData(
        req.user!.userId,
        habitIds,
        period,
      );
      res.json({ data });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async getOverview(req: AuthRequest, res: Response) {
    try {
      const period = Number(req.query.period ?? 30) as 7 | 30 | 90 | 365;
      const data = await analyticsService.getOverview(req.user!.userId, period);
      res.json({ data });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
