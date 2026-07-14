import { Router } from "express";
import { register } from "../controllers/authController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

export const authRouter = Router();
authRouter.post("/register", asyncHandler(register));
