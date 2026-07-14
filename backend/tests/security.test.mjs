import assert from "node:assert/strict";
import test from "node:test";
import { issueDemoSession } from "../dist/lib/demoSession.js";
import { allowOnly, inputRecord } from "../dist/lib/validation.js";
import { requireAuth } from "../dist/middlewares/authMiddleware.js";
import { createRateLimiter } from "../dist/middlewares/rateLimit.js";
import { errorHandler } from "../dist/middlewares/errorHandler.js";

function runAuthMiddleware(authorization) {
  const req = { header: () => authorization };
  const res = { locals: {} };
  let error;
  requireAuth(req, res, (nextError) => {
    error = nextError;
  });
  return { error, locals: res.locals };
}

test("authentication middleware requires a signed Bearer demo session", () => {
  const missing = runAuthMiddleware(undefined);
  assert.equal(missing.error.code, "UNAUTHENTICATED");

  const session = issueDemoSession(7);
  const accepted = runAuthMiddleware(`Bearer ${session.token}`);
  assert.equal(accepted.error, undefined);
  assert.equal(accepted.locals.session.userId, 7);
});

test("allow lists reject real contact and payment fields", () => {
  const allowed = ["nickname", "faculty", "department", "year", "iconUrl"];
  for (const key of ["email", "phone", "address", "password", "cardNumber", "bankAccount"]) {
    assert.throws(
      () => allowOnly(inputRecord({ nickname: "Demo", [key]: "forbidden" }), allowed),
      new RegExp(key),
    );
  }
});

test("in-memory rate limit rejects requests over the configured window", () => {
  const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
  const headers = new Map();
  let statusCode = 200;
  let payload;
  let nextCalls = 0;
  const request = { ip: "127.0.0.1", socket: {} };
  const response = {
    locals: { requestId: "test-request" },
    setHeader: (key, value) => headers.set(key, value),
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      payload = value;
      return this;
    },
  };

  limiter(request, response, () => { nextCalls += 1; });
  limiter(request, response, () => { nextCalls += 1; });
  limiter(request, response, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(statusCode, 429);
  assert.equal(payload.error.code, "RATE_LIMITED");
  assert.equal(headers.get("RateLimit-Limit"), "2");
  assert.ok(Number(headers.get("Retry-After")) >= 1);
});

test("server error logs omit request data and error messages", () => {
  const request = {
    method: "POST",
    baseUrl: "/api",
    route: { path: "/test-error" },
    body: { email: "real-person@example.com" },
    query: { token: "secret-token" },
    ip: "192.0.2.10",
  };
  let statusCode = 200;
  let payload;
  const response = {
    locals: { requestId: "request-safe-id" },
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      payload = value;
      return this;
    },
  };
  const originalError = console.error;
  const logs = [];
  console.error = (value) => logs.push(String(value));
  try {
    errorHandler(
      new Error("real-person@example.com secret-token 192.0.2.10"),
      request,
      response,
      () => {},
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(statusCode, 500);
  assert.equal(payload.error.message, "Internal Server Error");
  assert.equal(logs.length, 1);
  assert.match(logs[0], /request-safe-id/);
  assert.match(logs[0], /\/api\/test-error/);
  assert.doesNotMatch(logs[0], /real-person|secret-token|192\.0\.2\.10/);
});
