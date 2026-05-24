// Mock habitService so we test the controller in isolation
jest.mock("@/services/habitService", () => ({
  habitService: {
    getAllByUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsertCompletion: jest.fn(),
    getCompletions: jest.fn(),
  },
}));

// Bypass auth middleware by injecting a fake user
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

const mockHabit = habitService as jest.Mocked<typeof habitService>;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/habits", habitsRouter);
  return app;
}

describe("habitsController", () => {
  beforeEach(() => {
    Object.values(mockHabit).forEach((fn) => (fn as jest.Mock).mockReset());
  });

  describe("GET /habits", () => {
    it("returns all habits for the user", async () => {
      mockHabit.getAllByUser.mockResolvedValue([
        { id: 1, name: "Run", todayPct: 80, weekAvgPct: 75 },
      ] as any);

      const res = await request(makeApp()).get("/habits");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(mockHabit.getAllByUser).toHaveBeenCalledWith(1);
    });

    it("returns 500 on service error", async () => {
      mockHabit.getAllByUser.mockRejectedValue(new Error("boom"));
      const res = await request(makeApp()).get("/habits");
      expect(res.status).toBe(500);
    });
  });

  describe("POST /habits", () => {
    it("creates a habit", async () => {
      mockHabit.create.mockResolvedValue({ id: 1, name: "Run" } as any);

      const res = await request(makeApp())
        .post("/habits")
        .send({ name: "Run", frequency: "daily", streakThreshold: 50 });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Run");
    });

    it("returns 400 with no name", async () => {
      const res = await request(makeApp())
        .post("/habits")
        .send({ frequency: "daily" });
      expect(res.status).toBe(400);
    });

    it("returns 400 with invalid frequency", async () => {
      const res = await request(makeApp())
        .post("/habits")
        .send({ name: "Run", frequency: "monthly" });
      expect(res.status).toBe(400);
    });

    it("returns 500 on service error", async () => {
      mockHabit.create.mockRejectedValue(new Error("db"));
      const res = await request(makeApp())
        .post("/habits")
        .send({ name: "Run" });
      expect(res.status).toBe(500);
    });
  });

  describe("PUT /habits/:id", () => {
    it("updates a habit", async () => {
      mockHabit.update.mockResolvedValue({ id: 1, name: "Walk" } as any);

      const res = await request(makeApp())
        .put("/habits/1")
        .send({ name: "Walk" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Walk");
    });

    it("returns 404 when habit not found", async () => {
      mockHabit.update.mockRejectedValue(new Error("NOT_FOUND"));
      const res = await request(makeApp())
        .put("/habits/99")
        .send({ name: "Walk" });
      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected error", async () => {
      mockHabit.update.mockRejectedValue(new Error("DB"));
      const res = await request(makeApp())
        .put("/habits/1")
        .send({ name: "Walk" });
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE /habits/:id", () => {
    it("deletes a habit", async () => {
      mockHabit.delete.mockResolvedValue(undefined as any);
      const res = await request(makeApp()).delete("/habits/1");
      expect(res.status).toBe(204);
    });

    it("returns 404 when not found", async () => {
      mockHabit.delete.mockRejectedValue(new Error("NOT_FOUND"));
      const res = await request(makeApp()).delete("/habits/99");
      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected error", async () => {
      mockHabit.delete.mockRejectedValue(new Error("DB"));
      const res = await request(makeApp()).delete("/habits/1");
      expect(res.status).toBe(500);
    });
  });
});
