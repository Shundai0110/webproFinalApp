import { Router } from "express";
import { index } from "../controllers/notificationController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get("/", asyncHandler(index));
