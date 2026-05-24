import { prismaMock, resetPrismaMock } from "../__mocks__/prismaMock";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authService } from "@/services/authService";

describe("authService", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe("register", () => {
    it("creates a new user and returns token + safe user fields", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 1,
        email: "new@test.com",
        createdAt: new Date("2026-01-01"),
      });

      const result = await authService.register("new@test.com", "password123");

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: "new@test.com" },
      });
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: "new@test.com" }),
          select: { id: true, email: true, createdAt: true },
        }),
      );
      expect(result.user).toEqual({
        id: 1,
        email: "new@test.com",
        createdAt: expect.any(Date),
      });
      expect(typeof result.token).toBe("string");

      // password is hashed, not stored as plaintext
      const createCall = prismaMock.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe("password123");
      expect(
        await bcrypt.compare("password123", createCall.data.passwordHash),
      ).toBe(true);

      // verify token payload
      const decoded = jwt.verify(
        result.token,
        process.env.JWT_SECRET!,
      ) as { userId: number; email: string };
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe("new@test.com");
    });

    it("throws EMAIL_TAKEN when email already exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: "taken@test.com",
      });

      await expect(
        authService.register("taken@test.com", "password123"),
      ).rejects.toThrow("EMAIL_TAKEN");

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("returns token + user when credentials are valid", async () => {
      const hash = await bcrypt.hash("password123", 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 5,
        email: "user@test.com",
        passwordHash: hash,
        createdAt: new Date("2026-01-01"),
      });

      const result = await authService.login("user@test.com", "password123");

      expect(result.user).toEqual({
        id: 5,
        email: "user@test.com",
        createdAt: expect.any(Date),
      });
      expect(typeof result.token).toBe("string");
    });

    it("throws INVALID_CREDENTIALS when user does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login("noone@test.com", "password123"),
      ).rejects.toThrow("INVALID_CREDENTIALS");
    });

    it("throws INVALID_CREDENTIALS when password is wrong", async () => {
      const hash = await bcrypt.hash("correct-password", 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 5,
        email: "user@test.com",
        passwordHash: hash,
        createdAt: new Date(),
      });

      await expect(
        authService.login("user@test.com", "wrong-password"),
      ).rejects.toThrow("INVALID_CREDENTIALS");
    });
  });
});
