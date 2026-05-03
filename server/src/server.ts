import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRouter from "@/routes/auth";
import habitsRouter from "@/routes/habits";
import analyticsRouter from '@/routes/analytics'
import recommendationsRouter from '@/routes/recommendations'
import { startRecommendationJob } from '@/jobs/recommendationJob'

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ─── Routes ──────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/habits", habitsRouter);

app.use('/api/analytics', analyticsRouter)
app.use('/api/recommendations', recommendationsRouter)

// ─── Global error handler ─────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong" });
  },
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
startRecommendationJob()

export default app;
