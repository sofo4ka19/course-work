import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { recommendationService } from "@/services/recommendationService";

export function startRecommendationJob() {
  // Щонеділі о 08:00: секунда хвилина година день_місяця місяць день_тижня
  cron.schedule("0 8 * * 0", async () => {
    console.log("[cron] Generating recommendations…");
    const start = Date.now();

    try {
      const users = await prisma.user.findMany({ select: { id: true } });
      let total = 0;
      for (const user of users) {
        const count = await recommendationService.generate(user.id);
        total += count;
      }
      console.log(
        `[cron] Done in ${Date.now() - start}ms — ${total} recommendations generated`,
      );
    } catch (err) {
      console.error("[cron] Failed:", err);
    }
  });
}
