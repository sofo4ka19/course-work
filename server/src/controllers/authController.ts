import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { authService } from "@/services/authService";

export const authController = {
  async register(req: Request, res: Response) {
    // Перевіряємо результати валідації (визначена у роутері)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
      return;
    }

    try {
      const { email, password } = req.body;
      const result = await authService.register(email, password);
      res
        .status(201)
        .json({ data: result, message: "Registered successfully" });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "EMAIL_TAKEN") {
        res.status(409).json({ error: "Email already registered" });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async login(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
      return;
    }

    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.status(200).json({ data: result });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
