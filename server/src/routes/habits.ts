import { Router } from "express";
import { body } from "express-validator";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { habitsController } from "@/controllers/habitsController";

const router = Router();

// authMiddleware застосовується до всіх маршрутів цього роутера
router.use(authMiddleware as any);

const habitValidation = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name max 100 chars"),
  body("frequency")
    .optional()
    .isIn(["daily", "weekly", "custom"])
    .withMessage("Invalid frequency"),
  body("streakThreshold")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Threshold must be 1–100"),
];

router.get("/", habitsController.getAll);
router.post("/", habitValidation, habitsController.create);
router.put("/:id", habitValidation, habitsController.update);
router.delete("/:id", habitsController.remove);

export default router;
