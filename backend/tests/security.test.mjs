import assert from "node:assert/strict";
import test from "node:test";
import { issueDemoSession } from "../dist/lib/demoSession.js";
import { allowOnly, inputRecord } from "../dist/lib/validation.js";
import { requireAuth } from "../dist/middlewares/authMiddleware.js";

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
