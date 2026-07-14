import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { verifyDemoSession, type DemoSessionClaims } from "../lib/demoSession.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError(401, "UNAUTHENTICATED", "Bearerデモセッションが必要です"));
    return;
  }

  res.locals.session = verifyDemoSession(authorization.slice("Bearer ".length));
  next();
};

export function currentSession(locals: Record<string, unknown>): DemoSessionClaims {
  const session = locals.session;
  if (!session) {
    throw new AppError(401, "UNAUTHENTICATED", "デモセッションが必要です");
  }
  return session as DemoSessionClaims;
}
