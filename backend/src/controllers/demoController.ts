import type { RequestHandler } from "express";
import { sendSuccess } from "../lib/http.js";
import { allowOnly, inputRecord, requiredString } from "../lib/validation.js";
import {
  closeDemoClient,
  heartbeatDemoClient,
  openDemoClient,
  resetEphemeralDemo,
} from "../services/ephemeralLifecycle.js";

function clientIdFrom(input: unknown) {
  const body = inputRecord(input);
  allowOnly(body, ["clientId"]);
  return requiredString(body, "clientId", 100);
}

export const open: RequestHandler = async (_req, res) => {
  sendSuccess(res, openDemoClient(), "一時データベースへ接続しました", 201);
};

export const heartbeat: RequestHandler = async (req, res) => {
  sendSuccess(res, { active: heartbeatDemoClient(clientIdFrom(req.body)) });
};

export const close: RequestHandler = async (req, res) => {
  sendSuccess(res, closeDemoClient(clientIdFrom(req.body)), "一時データベース接続を終了しました");
};

export const reset: RequestHandler = async (_req, res) => {
  sendSuccess(res, resetEphemeralDemo(), "一時データベースを初期化しました");
};
