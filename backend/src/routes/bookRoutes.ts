import { Router } from "express";
import { create, index, remove, show, update } from "../controllers/bookController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

export const bookRouter = Router();
bookRouter.use(requireAuth);
bookRouter.get("/", asyncHandler(index));
bookRouter.get("/:id", asyncHandler(show));
bookRouter.post("/", asyncHandler(create));
bookRouter.patch("/:id", asyncHandler(update));
bookRouter.delete("/:id", asyncHandler(remove));
