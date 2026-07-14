import type { RequestHandler } from "express";
import { sendSuccess } from "../lib/http.js";
import {
  listDemoAccounts,
  registerDemoAccount,
  startDemoSession,
} from "../services/authService.js";

export const register: RequestHandler = async (req, res) => {
  const result = await registerDemoAccount(req.body);
  sendSuccess(res, result, "デモアカウントを追加しました", 201);
};

export const accounts: RequestHandler = async (_req, res) => {
  sendSuccess(res, await listDemoAccounts());
};

export const session: RequestHandler = async (req, res) => {
  sendSuccess(res, await startDemoSession(req.body), "デモセッションを開始しました", 201);
};
