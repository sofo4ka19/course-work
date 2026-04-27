import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { type AuthPayload, AuthRequest } from "@/types";

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  // Стандартний формат заголовку: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    // Кладемо дані користувача в req — доступні у всіх наступних handlers
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    // jwt.verify кидає помилку якщо токен протермінований або підроблений
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
