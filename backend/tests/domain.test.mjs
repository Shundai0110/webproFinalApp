import assert from "node:assert/strict";
import test from "node:test";
import { issueDemoSession, verifyDemoSession } from "../dist/lib/demoSession.js";
import { nextApprovalState } from "../dist/domain/transactionPolicy.js";
import { calculateRelatedScore } from "../dist/services/rankingService.js";

test("signed demo sessions round-trip and reject tampering", () => {
  const session = issueDemoSession(42);
  const claims = verifyDemoSession(session.token);
  assert.equal(claims.userId, 42);
  assert.ok(Date.parse(session.expiresAt) > Date.now());

  const tampered = `${session.token.slice(0, -1)}${session.token.endsWith("a") ? "b" : "a"}`;
  assert.throws(() => verifyDemoSession(tampered), /不正/);
});

test("transactions complete only after buyer and seller approvals", () => {
  const transaction = {
    buyerId: 1,
    sellerId: 2,
    buyerApproved: false,
    sellerApproved: false,
  };
  const buyer = nextApprovalState(transaction, 1);
  assert.deepEqual(buyer, {
    buyerApproved: true,
    sellerApproved: false,
    shouldComplete: false,
  });
  const seller = nextApprovalState({ ...transaction, ...buyer }, 2);
  assert.equal(seller.shouldComplete, true);
  assert.throws(() => nextApprovalState(transaction, 3), /購入者または出品者/);
  assert.throws(
    () => nextApprovalState({ ...transaction, buyerApproved: true }, 1),
    /すでに承諾/,
  );
});

test("book ranking favors matching demo profiles", () => {
  const score = calculateRelatedScore(
    {
      title: "経済学入門",
      usedLesson: "経済学 I",
      usedFaculty: "経済学部",
      usedDepartment: "経済学科",
      targetYear: 1,
      materialType: "REQUIRED",
      usedYear: new Date().getFullYear(),
    },
    { faculty: "経済学部", department: "経済学科", year: 1 },
    "経済学",
  );
  assert.equal(score, 125);
});
