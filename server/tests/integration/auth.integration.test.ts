// Integration tests: route → middleware → controller → service → (mocked) Prisma.
// Only Prisma is mocked; everything else runs as in production.

import { prismaMock, resetPrismaMock } from "../__mocks__/prismaMock";
import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import authRouter from "@/routes/auth";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  return app;
}

describe("integration: /auth", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  it("registers a new user and returns a JWT", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 1,
      email: "new@test.com",
      createdAt: new Date(),
    });

    const res = await request(makeApp())
      .post("/auth/register")
      .send({ email: "new@test.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user).toEqual({
      id: 1,
      email: "new@test.com",
      createdAt: expect.any(String),
    });
    // verify Prisma was actually called by the service, not just the controller
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it("rejects duplicate-email registration with 409", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 1, email: "taken@test.com" });

    const res = await request(makeApp())
      .post("/auth/register")
      .send({ email: "taken@test.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("logs in with correct credentials and returns a JWT", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 5,
      email: "user@test.com",
      passwordHash,
      createdAt: new Date(),
    });

    const res = await request(makeApp())
      .post("/auth/login")
      .send({ email: "user@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it("rejects login with wrong password (401, generic error)", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 5,
      email: "user@test.com",
      passwordHash,
      createdAt: new Date(),
    });

    const res = await request(makeApp())
      .post("/auth/login")
      .send({ email: "user@test.com", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });
});
