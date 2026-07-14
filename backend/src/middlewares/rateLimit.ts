import { createHash, randomBytes } from "node:crypto";
import type { Request, RequestHandler } from "express";

type RateLimitOptions = {
  max: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const processSalt = randomBytes(32);

function anonymousClientKey(req: Request) {
  // IPは保存せず、サービス再起動ごとに変わるsaltで不可逆な一時識別子へ変換する。
  const source = req.ip || req.socket.remoteAddress || "unknown";
  return createHash("sha256").update(processSalt).update(source).digest("hex");
}

export function createRateLimiter({ max, windowMs }: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();
  let lastSweep = 0;

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      buckets.forEach((bucket, key) => {
        if (bucket.resetAt <= now) buckets.delete(key);
      });
      lastSweep = now;
    }

    const key = anonymousClientKey(req);
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "リクエストが多すぎます。しばらく待ってから再試行してください",
          requestId: res.locals.requestId,
        },
      });
      return;
    }
    next();
  };
}

export const apiRateLimit = createRateLimiter({ max: 180, windowMs: 60_000 });
