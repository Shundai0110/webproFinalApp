import type { RequestHandler } from "express";
import { sendSuccess } from "../lib/http.js";
import { registerDemoAccount } from "../services/authService.js";

export const register: RequestHandler = async (req, res) => {
  const result = await registerDemoAccount(req.body);
  sendSuccess(res, result, "デモアカウントを追加しました", 201);
};
