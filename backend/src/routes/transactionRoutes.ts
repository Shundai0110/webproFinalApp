import { Router } from "express";
import { create, index, show, update } from "../controllers/transactionController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

export const transactionRouter = Router();
transactionRouter.use(requireAuth);
transactionRouter.get("/", asyncHandler(index));
transactionRouter.post("/", asyncHandler(create));
transactionRouter.get("/:id", asyncHandler(show));
transactionRouter.patch("/:id", asyncHandler(update));
