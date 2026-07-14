import type { ErrorRequestHandler, Request } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

function logServerError(
  error: unknown,
  req: Request,
  requestId: unknown,
  status: number,
  code: string,
) {
  if (status < 500) return;
  // 生path、body、query、Authorization、IP、エラー本文は個人情報混入を避けるため記録しない。
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    requestId,
    method: req.method,
    route: req.route?.path ? `${req.baseUrl}${String(req.route.path)}` : "unmatched",
    status,
    code,
    errorType: error instanceof Error ? error.name : "UnknownError",
  }));
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = res.locals.requestId;
  if (error instanceof AppError) {
    logServerError(error, req, requestId, error.status, error.code);
    res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, requestId },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({
      success: false,
      error: { code: "CONFLICT", message: "同じ識別子のデータがすでに存在します", requestId },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    res.status(409).json({
      success: false,
      error: { code: "CONCURRENT_UPDATE", message: "同時更新を検出しました。再度お試しください", requestId },
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "JSON形式が不正です", requestId },
    });
    return;
  }

  logServerError(error, req, requestId, 500, "INTERNAL_SERVER_ERROR");

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      requestId,
    },
  });
};
