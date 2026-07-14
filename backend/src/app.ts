import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRouter } from "./routes/authRoutes.js";
import { bookRouter } from "./routes/bookRoutes.js";
import { healthRouter } from "./routes/healthRoutes.js";
import { notificationRouter } from "./routes/notificationRoutes.js";
import { transactionRouter } from "./routes/transactionRoutes.js";
import { userRouter } from "./routes/userRoutes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: false,
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/books", bookRouter);
  app.use("/api/transactions", transactionRouter);
  app.use("/api/notifications", notificationRouter);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "APIエンドポイントが見つかりません" },
    });
  });

  app.use(errorHandler);

  return app;
}
