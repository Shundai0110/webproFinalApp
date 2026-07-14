import type { RequestHandler } from "express";
import { sendSuccess } from "../lib/http.js";
import { currentSession } from "../middlewares/authMiddleware.js";
import { listOwnNotifications } from "../services/transactionService.js";

export const index: RequestHandler = async (req, res) => {
  sendSuccess(res, await listOwnNotifications(currentSession(res.locals).userId, req.query));
};
