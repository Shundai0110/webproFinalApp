import { Router } from "express";
import { close, heartbeat, open, reset } from "../controllers/demoController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

export const demoRouter = Router();
demoRouter.post("/open", asyncHandler(open));
demoRouter.post("/heartbeat", asyncHandler(heartbeat));
demoRouter.post("/close", asyncHandler(close));
demoRouter.post("/reset", requireAuth, asyncHandler(reset));
