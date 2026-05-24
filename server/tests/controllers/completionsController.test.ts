jest.mock("@/services/habitService", () => ({
  habitService: {
    upsertCompletion: jest.fn(),
    getCompletions: jest.fn(),
    getAllByUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
import habitsRouter from "@/routes/habits";
import { habitService } from "@/services/habitService";
import { localDateStr } from "@/utils/date";

const mockHabit = habitService as jest.Mocked<typeof habitService>;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/habits", habitsRouter);
  return app;
}

describe("completionsController", () => {
  beforeEach(() => {
    Object.values(mockHabit).forEach((fn) => (fn as jest.Mock).mockReset());
  });

  describe("POST /habits/:id/completions", () => {
    it("upserts a completion", async () => {
      mockHabit.upsertCompletion.mockResolvedValue({
        id: 1,
        habitId: 1,
        completionPct: 80,
        completionDate: new Date(),
      } as any);

      const res = await request(makeApp())
        .post("/habits/1/completions")
        .send({ completionPct: 80 });

      expect(res.status).toBe(201);
      expect(res.body.data.completionPct).toBe(80);
    });

    it("returns 400 for percentage out of range", async () => {
      const res = await request(makeApp())
        .post("/habits/1/completions")
        .send({ completionPct: 150 });
      expect(res.status).toBe(400);
    });

    it("returns 400 when date is in the future", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tStr = localDateStr(tomorrow);

      const res = await request(makeApp())
        .post("/habits/1/completions")
        .send({ completionPct: 80, date: tStr });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Cannot log future dates");
    });

    it("returns 404 when habit not found", async () => {
      mockHabit.upsertCompletion.mockRejectedValue(new Error("NOT_FOUND"));
      const res = await request(makeApp())
        .post("/habits/99/completions")
        .send({ completionPct: 80 });
      expect(res.status).toBe(404);
    });

    it("returns 400 when service reports INVALID_PCT", async () => {
      mockHabit.upsertCompletion.mockRejectedValue(new Error("INVALID_PCT"));
      const res = await request(makeApp())
        .post("/habits/1/completions")
        .send({ completionPct: 50 });
      expect(res.status).toBe(400);
    });

    it("returns 500 on unexpected error", async () => {
      mockHabit.upsertCompletion.mockRejectedValue(new Error("BOOM"));
      const res = await request(makeApp())
        .post("/habits/1/completions")
        .send({ completionPct: 50 });
      expect(res.status).toBe(500);
    });
  });

  describe("GET /habits/:id/completions", () => {
    it("returns completions", async () => {
      mockHabit.getCompletions.mockResolvedValue([
        { id: 1, completionPct: 80, completionDate: new Date() },
      ] as any);

      const res = await request(makeApp()).get("/habits/1/completions");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("returns 404 when habit not found", async () => {
      mockHabit.getCompletions.mockRejectedValue(new Error("NOT_FOUND"));
      const res = await request(makeApp()).get("/habits/99/completions");
      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected error", async () => {
      mockHabit.getCompletions.mockRejectedValue(new Error("BOOM"));
      const res = await request(makeApp()).get("/habits/1/completions");
      expect(res.status).toBe(500);
    });
  });
});
