import { Router } from "express";
import { query } from "express-validator";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { analyticsController } from "@/controllers/analyticsController";

const router = Router();
router.use(authMiddleware as any);

router.get("/dashboard", analyticsController.getDashboard);

router.get(
  "/chart",
  [
    query("period")
      .optional()
      .isIn(["7", "30", "90"])
      .withMessage("Period must be 7, 30 or 90"),
  ],
  analyticsController.getChart,
);
router.get("/overview", analyticsController.getOverview);

export default router;
