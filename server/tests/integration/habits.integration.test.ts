// Integration: real route → real authMiddleware → real controller → real
// habitService → mocked Prisma. We mint a real JWT so authMiddleware accepts it.

import { prismaMock, resetPrismaMock } from "../__mocks__/prismaMock";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import habitsRouter from "@/routes/habits";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/habits", habitsRouter);
  return app;
}

function authHeader(userId = 1, email = "user@test.com") {
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });
  return `Bearer ${token}`;
}

describe("integration: /habits (auth required)", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(makeApp()).get("/habits");
    expect(res.status).toBe(401);
    expect(prismaMock.habit.findMany).not.toHaveBeenCalled();
  });

  it("lists habits for the authenticated user", async () => {
    prismaMock.habit.findMany.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        name: "Run",
        description: null,
        frequency: "daily",
        customFrequency: null,
        streakThreshold: 50,
        currentStreak: 3,
        maxStreak: 5,
        createdAt: new Date(),
      },
    ] as any);
    prismaMock.completion.findFirst.mockResolvedValue(null);
    prismaMock.completion.findMany.mockResolvedValue([]);

    const res = await request(makeApp())
      .get("/habits")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Run");
    // verifies the user filter actually flowed from JWT → controller → service → Prisma
    expect(prismaMock.habit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 } }),
    );
  });

  it("creates a habit through the full request pipeline", async () => {
    prismaMock.habit.create.mockResolvedValue({
      id: 1,
      userId: 1,
      name: "Morning yoga",
      frequency: "daily",
      streakThreshold: 60,
    } as any);

    const res = await request(makeApp())
      .post("/habits")
      .set("Authorization", authHeader())
      .send({
        name: "Morning yoga",
        description: "10 min",
        frequency: "daily",
        streakThreshold: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Morning yoga");
    expect(prismaMock.habit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1,
        name: "Morning yoga",
        frequency: "daily",
        streakThreshold: 60,
      }),
    });
  });

  it("rejects habit creation with invalid frequency (400)", async () => {
    const res = await request(makeApp())
      .post("/habits")
      .set("Authorization", authHeader())
      .send({ name: "Bad", frequency: "monthly" });

    expect(res.status).toBe(400);
    expect(prismaMock.habit.create).not.toHaveBeenCalled();
  });

  it("returns 404 when updating a habit that belongs to another user", async () => {
    // Habit exists but is owned by userId=99, request comes from userId=1
    prismaMock.habit.findUnique.mockResolvedValue({
      id: 1,
      userId: 99,
      name: "Someone else's",
    } as any);

    const res = await request(makeApp())
      .put("/habits/1")
      .set("Authorization", authHeader())
      .send({ name: "Hacked" });

    expect(res.status).toBe(404);
    expect(prismaMock.habit.update).not.toHaveBeenCalled();
  });

  it("upserts a completion through the full request pipeline", async () => {
    prismaMock.habit.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      name: "Run",
      frequency: "daily",
      streakThreshold: 50,
      currentStreak: 0,
      maxStreak: 0,
    } as any);
    prismaMock.completion.upsert.mockResolvedValue({
      id: 1,
      habitId: 1,
      completionPct: 80,
      completionDate: new Date(),
    } as any);
    prismaMock.completion.findMany.mockResolvedValue([
      { completionDate: new Date(), completionPct: 80 },
    ] as any);
    prismaMock.habit.update.mockResolvedValue({} as any);

    const res = await request(makeApp())
      .post("/habits/1/completions")
      .set("Authorization", authHeader())
      .send({ completionPct: 80 });

    expect(res.status).toBe(201);
    expect(prismaMock.completion.upsert).toHaveBeenCalled();
    // streak recalculation also runs
    expect(prismaMock.habit.update).toHaveBeenCalled();
  });
});
