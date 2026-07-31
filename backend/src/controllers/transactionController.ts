import type { RequestHandler } from "express";
import { sendSuccess } from "../lib/http.js";
import { parsePositiveId } from "../lib/validation.js";
import { currentSession } from "../middlewares/authMiddleware.js";
import {
  getTransaction,
  listOwnTransactions,
  requestTransaction,
  updateTransaction,
} from "../services/transactionService.js";

export const index: RequestHandler = async (req, res) => {
  sendSuccess(res, await listOwnTransactions(currentSession(res.locals).userId, req.query));
};

export const create: RequestHandler = async (req, res) => {
  const transaction = await requestTransaction(currentSession(res.locals).userId, req.body);
  sendSuccess(res, transaction, "購入相談を作成しました", 201);
};

export const show: RequestHandler = async (req, res) => {
  const transaction = await getTransaction(
    currentSession(res.locals).userId,
    parsePositiveId(req.params.id, "transactionId"),
  );
  sendSuccess(res, transaction);
};

export const update: RequestHandler = async (req, res) => {
  const action = req.body?.action;
  const transaction = await updateTransaction(
    currentSession(res.locals).userId,
    parsePositiveId(req.params.id, "transactionId"),
    req.body,
  );
  let message = "取引を承諾しました";
  if (transaction.status === "COMPLETED") message = "取引が成立しました";
  if (action === "REVOKE_APPROVAL") message = "承認を取り消しました";
  if (action === "CANCEL_PURCHASE") message = "購入申請を取り消しました";
  sendSuccess(res, transaction, message);
};
