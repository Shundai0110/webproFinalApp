import type { Response } from "express";

export function sendSuccess(
  res: Response,
  data: unknown,
  message = "success",
  status = 200,
) {
  return res.status(status).json({ success: true, data, message });
}
