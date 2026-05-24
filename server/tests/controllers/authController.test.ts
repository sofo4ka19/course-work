// Mock authService so the controller is tested in isolation
jest.mock("@/services/authService", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
  },
}));

import express from "express";
import request from "supertest";
import authRouter from "@/routes/auth";
import { authService } from "@/services/authService";

const mockAuth = authService as jest.Mocked<typeof authService>;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  return app;
}

describe("authController", () => {
  beforeEach(() => {
    mockAuth.register.mockReset();
    mockAuth.login.mockReset();
  });

  describe("POST /auth/register", () => {
    it("returns 400 when email is invalid", async () => {
      const res = await request(makeApp())
        .post("/auth/register")
        .send({ email: "not-an-email", password: "password123" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    it("returns 400 when password is too short", async () => {
      const res = await request(makeApp())
        .post("/auth/register")
        .send({ email: "user@test.com", password: "short" });

      expect(res.status).toBe(400);
    });

    it("returns 201 with token + user on success", async () => {
      mockAuth.register.mockResolvedValue({
        token: "fake-token",
        user: { id: 1, email: "user@test.com", createdAt: new Date() },
      } as any);

      const res = await request(makeApp())
        .post("/auth/register")
        .send({ email: "user@test.com", password: "password123" });

      expect(res.status).toBe(201);
      expect(res.body.data.token).toBe("fake-token");
      expect(res.body.data.user.email).toBe("user@test.com");
    });

    it("returns 409 when email is already taken", async () => {
      mockAuth.register.mockRejectedValue(new Error("EMAIL_TAKEN"));

      const res = await request(makeApp())
        .post("/auth/register")
        .send({ email: "taken@test.com", password: "password123" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Email already registered");
    });

    it("returns 500 on unexpected error", async () => {
      mockAuth.register.mockRejectedValue(new Error("DB_DOWN"));

      const res = await request(makeApp())
        .post("/auth/register")
        .send({ email: "user@test.com", password: "password123" });

      expect(res.status).toBe(500);
    });
  });

  describe("POST /auth/login", () => {
    it("returns 400 on invalid input", async () => {
      const res = await request(makeApp())
        .post("/auth/login")
        .send({ email: "bad", password: "x" });
      expect(res.status).toBe(400);
    });

    it("returns 200 with token on success", async () => {
      mockAuth.login.mockResolvedValue({
        token: "fake-token",
        user: { id: 1, email: "user@test.com", createdAt: new Date() },
      } as any);

      const res = await request(makeApp())
        .post("/auth/login")
        .send({ email: "user@test.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBe("fake-token");
    });

    it("returns 401 on invalid credentials", async () => {
      mockAuth.login.mockRejectedValue(new Error("INVALID_CREDENTIALS"));

      const res = await request(makeApp())
        .post("/auth/login")
        .send({ email: "user@test.com", password: "password123" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid email or password");
    });

    it("returns 500 on unexpected error", async () => {
      mockAuth.login.mockRejectedValue(new Error("DB_ERR"));

      const res = await request(makeApp())
        .post("/auth/login")
        .send({ email: "user@test.com", password: "password123" });

      expect(res.status).toBe(500);
    });
  });
});
