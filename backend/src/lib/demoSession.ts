import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

const SESSION_DURATION_SECONDS = 2 * 60 * 60;

export type DemoSessionClaims = {
  version: 1;
  userId: number;
  sessionId: string;
  expiresAt: number;
};

function sign(payload: string) {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
}

export function issueDemoSession(userId: number) {
  const now = Math.floor(Date.now() / 1000);
  const claims: DemoSessionClaims = {
    version: 1,
    userId,
    sessionId: randomUUID(),
    expiresAt: now + SESSION_DURATION_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return {
    token: `${payload}.${sign(payload)}`,
    expiresAt: new Date(claims.expiresAt * 1000).toISOString(),
  };
}

export function verifyDemoSession(token: string): DemoSessionClaims {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    throw new AppError(401, "UNAUTHENTICATED", "デモセッションが不正です");
  }

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new AppError(401, "UNAUTHENTICATED", "デモセッションが不正です");
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<DemoSessionClaims>;
    if (
      claims.version !== 1 ||
      !Number.isInteger(claims.userId) ||
      (claims.userId as number) < 1 ||
      typeof claims.sessionId !== "string" ||
      !Number.isInteger(claims.expiresAt) ||
      (claims.expiresAt as number) <= Math.floor(Date.now() / 1000)
    ) {
      throw new Error();
    }
    return claims as DemoSessionClaims;
  } catch {
    throw new AppError(401, "UNAUTHENTICATED", "デモセッションが期限切れか不正です");
  }
}
