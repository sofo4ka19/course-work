import jwt from "jsonwebtoken";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { AuthRequest } from "@/types";
import { Response } from "express";

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("authMiddleware", () => {
  it("rejects request with missing Authorization header", () => {
    const req = { headers: {} } as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects header that does not start with 'Bearer '", () => {
    const req = {
      headers: { authorization: "Basic abc.def" },
    } as unknown as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid token", () => {
    const req = {
      headers: { authorization: "Bearer this-is-not-a-valid-jwt" },
    } as unknown as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects expired token", () => {
    const token = jwt.sign(
      { userId: 1, email: "a@b.c" },
      process.env.JWT_SECRET!,
      { expiresIn: -1 },
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches user and calls next() on valid token", () => {
    const token = jwt.sign(
      { userId: 42, email: "user@test.com" },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(req.user).toEqual({ userId: 42, email: "user@test.com" });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
