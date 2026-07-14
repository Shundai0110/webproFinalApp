import { Router } from "express";
import { env } from "../config/env.js";
import { ephemeralStore } from "../lib/ephemeralStore.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "keio-book-api",
      storage: env.storageMode === "ephemeral" ? ephemeralStore.stats() : { mode: "mysql" },
    },
    message: "healthy",
  });
});
