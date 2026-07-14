import cors from "cors";
import express from "express";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRouter } from "./routes/authRoutes.js";
import { bookRouter } from "./routes/bookRoutes.js";
import { commentRouter } from "./routes/commentRoutes.js";
import { demoRouter } from "./routes/demoRoutes.js";
import { healthRouter } from "./routes/healthRoutes.js";
import { notificationRouter } from "./routes/notificationRoutes.js";
import { transactionRouter } from "./routes/transactionRoutes.js";
import { userRouter } from "./routes/userRoutes.js";

const frontendRoot = fileURLToPath(new URL("../../frontend/", import.meta.url));

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "8kb" }));
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
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' http://127.0.0.1:4000; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    next();
  });

  app.use("/api/health", healthRouter);
  app.use("/api/demo", demoRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/books", bookRouter);
  app.use("/api/transactions", transactionRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/comments", commentRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "APIエンドポイントが見つかりません" },
    });
  });

  if (env.serveFrontend) {
    app.use(express.static(frontendRoot, { index: "index.html", maxAge: 0 }));
    app.use((req, res, next) => {
      if (req.method === "GET" && req.accepts("html")) {
        res.sendFile(join(frontendRoot, "index.html"));
        return;
      }
      next();
    });
  }

  app.use((_req, res) => {
    res.status(404).type("text/plain").send("Not Found");
  });

  app.use(errorHandler);

  return app;
}
