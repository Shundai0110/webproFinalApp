import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { healthRouter } from "./routes/healthRoutes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
    }),
  );

  app.use("/api/health", healthRouter);

  app.use(errorHandler);

  return app;
}
