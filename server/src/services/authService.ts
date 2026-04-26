import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { AuthPayload } from "@/types";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_TTL = "24h";

export const authService = {
  async register(email: string, password: string) {
    // Перевіряємо чи email вже зайнятий
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error("EMAIL_TAKEN");
    }

    // bcrypt.hash автоматично генерує сіль і змішує з паролем
    // SALT_ROUNDS=10 — баланс між безпекою і швидкістю (~100ms)
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, passwordHash },
      // повертаємо тільки безпечні поля — ніколи не повертаємо hash
      select: { id: true, email: true, createdAt: true },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email } satisfies AuthPayload,
      JWT_SECRET,
      { expiresIn: JWT_TTL },
    );

    return { token, user };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Важливо: однакове повідомлення помилки для обох випадків
    // (не існує і невірний пароль) — не підказуємо зловмиснику
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email } satisfies AuthPayload,
      JWT_SECRET,
      { expiresIn: JWT_TTL },
    );

    return {
      token,
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    };
  },
};
