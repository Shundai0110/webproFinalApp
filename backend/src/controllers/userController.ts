import type { RequestHandler } from "express";
import { currentSession } from "../middlewares/authMiddleware.js";
import { sendSuccess } from "../lib/http.js";
import { getOwnProfile, updateOwnProfile } from "../services/authService.js";

export const getMe: RequestHandler = async (_req, res) => {
  const user = await getOwnProfile(currentSession(res.locals).userId);
  sendSuccess(res, user);
};

export const updateMe: RequestHandler = async (req, res) => {
  const user = await updateOwnProfile(currentSession(res.locals).userId, req.body);
  sendSuccess(res, user, "プロフィールを更新しました");
};
