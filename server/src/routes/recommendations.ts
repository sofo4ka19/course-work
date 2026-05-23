import { Router } from "express";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { AuthRequest } from "@/types";
import { prisma } from "@/lib/prisma";
import { recommendationService } from "@/services/recommendationService";

const router = Router();
router.use(authMiddleware as any);

router.get("/", async (req: AuthRequest, res) => {
  const recs = await prisma.recommendation.findMany({
    where: { userId: req.user!.userId },
    orderBy: { generatedAt: "desc" },
  });
  res.json({ data: recs });
});

router.get("/unread-count", async (req: AuthRequest, res) => {
  const count = await prisma.recommendation.count({
    where: { userId: req.user!.userId, isRead: false },
  });
  res.json({ data: { count } });
});

router.patch("/:id/read", async (req: AuthRequest, res) => {
  await prisma.recommendation.updateMany({
    where: { id: Number(req.params.id), userId: req.user!.userId },
    data: { isRead: true },
  });
  res.json({ data: { ok: true } });
});

router.patch("/read-all", async (req: AuthRequest, res) => {
  await prisma.recommendation.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ data: { ok: true } });
});

router.post("/generate", async (req: AuthRequest, res) => {
  const count = await recommendationService.generate(req.user!.userId);
  res.json({ data: { generated: count } });
});

router.post("/auto-generate", async (req: AuthRequest, res) => {
  const count = await recommendationService.generateIfNeeded(req.user!.userId);
  res.json({ data: { generated: count } });
});

export default router;
