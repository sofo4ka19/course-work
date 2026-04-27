import { Response } from "express";
import { body, query, validationResult } from "express-validator";
import { AuthRequest } from "@/types";
import { habitService } from "@/services/habitService";

export const completionsController = {
  async upsert(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
      return;
    }

    try {
      const completion = await habitService.upsertCompletion(
        Number(req.params.id),
        req.user!.userId,
        req.body.completionPct,
      );
      res.status(201).json({ data: completion });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          res.status(404).json({ error: "Habit not found" });
          return;
        }
        if (err.message === "INVALID_PCT") {
          res.status(400).json({ error: "Percentage must be 0–100" });
          return;
        }
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getMany(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
      return;
    }

    try {
      const from = req.query.from
        ? new Date(req.query.from as string)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() - 90);
            return d;
          })();

      const to = req.query.to ? new Date(req.query.to as string) : new Date();

      const completions = await habitService.getCompletions(
        Number(req.params.id),
        req.user!.userId,
        from,
        to,
      );
      res.json({ data: completions });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        res.status(404).json({ error: "Habit not found" });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
