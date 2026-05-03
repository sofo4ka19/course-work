import { Response } from "express";
import { body, query, validationResult } from "express-validator";
import { AuthRequest } from "@/types";
import { habitService } from "@/services/habitService";
import { strToUTC, localDateStr, daysAgoStr, strToUTCEnd } from "@/utils/date";

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
      const { completionPct, date } = req.body; // date = "YYYY-MM-DD" або undefined

      // Забороняємо вводити майбутні дати
      if (date && date > localDateStr()) {
        res.status(400).json({ error: "Cannot log future dates" });
        return;
      }

      const completion = await habitService.upsertCompletion(
        Number(req.params.id),
        req.user!.userId,
        completionPct,
        date,
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
    try {
      const fromStr = req.query.from as string | undefined;
      const toStr = req.query.to as string | undefined;

      const from = fromStr ? strToUTC(fromStr) : strToUTC(daysAgoStr(90));
      const to = toStr ? strToUTCEnd(toStr) : strToUTCEnd(localDateStr());

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
