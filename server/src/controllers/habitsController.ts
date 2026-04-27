import { Response } from "express";
import { validationResult } from "express-validator";
import { AuthRequest } from "@/types";
import { habitService } from "@/services/habitService";

export const habitsController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const habits = await habitService.getAllByUser(req.user!.userId);
      res.json({ data: habits });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async create(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
      return;
    }

    try {
      const habit = await habitService.create(req.user!.userId, req.body);
      res.status(201).json({ data: habit });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async update(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
      return;
    }

    try {
      const habit = await habitService.update(
        Number(req.params.id),
        req.user!.userId,
        req.body,
      );
      res.json({ data: habit });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        res.status(404).json({ error: "Habit not found" });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      await habitService.delete(Number(req.params.id), req.user!.userId);
      res.status(204).send();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        res.status(404).json({ error: "Habit not found" });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
