import { Router } from "express";
import { index } from "../controllers/commentController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

export const commentRouter = Router();
commentRouter.use(requireAuth);
commentRouter.get("/", asyncHandler(index));
