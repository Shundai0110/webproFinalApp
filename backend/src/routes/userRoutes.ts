import { Router } from "express";
import { getMe, updateMe } from "../controllers/userController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

export const userRouter = Router();
userRouter.use(requireAuth);
userRouter.get("/me", asyncHandler(getMe));
userRouter.patch("/me", asyncHandler(updateMe));
