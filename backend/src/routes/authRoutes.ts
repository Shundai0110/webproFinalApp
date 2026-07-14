import { Router } from "express";
import { accounts, register, session } from "../controllers/authController.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

export const authRouter = Router();
authRouter.get("/accounts", asyncHandler(accounts));
authRouter.post("/register", asyncHandler(register));
authRouter.post("/session", asyncHandler(session));
