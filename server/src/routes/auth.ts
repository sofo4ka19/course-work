import { Router } from "express";
import { body } from "express-validator";
import { authController } from "@/controllers/authController";

const router = Router();

// Валідація визначається тут, у middleware-ланцюжку перед контролером
// Контролер лише перевіряє validationResult() — не дублює логіку
const authValidation = [
  body("email").isEmail().withMessage("Invalid email format").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

router.post("/register", authValidation, authController.register);
router.post("/login", authValidation, authController.login);

export default router;
