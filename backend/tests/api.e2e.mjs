import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../dist/app.js";
import { ephemeralStore } from "../dist/lib/ephemeralStore.js";

test("two demo users share API data and complete a virtual-point trade", async () => {
  ephemeralStore.reset();
  const initialBookCount = ephemeralStore.stats().books;
  const api = request(createApp());

  const firstOpen = await api.post("/api/demo/open").send({}).expect(201);
  const secondOpen = await api.post("/api/demo/open").send({}).expect(201);
  const sellerSession = await api.post("/api/auth/session").send({ userId: 1 }).expect(201);
  const buyerSession = await api.post("/api/auth/session").send({ userId: 2 }).expect(201);
  const sellerToken = sellerSession.body.data.session.token;
  const buyerToken = buyerSession.body.data.session.token;

  const created = await api
    .post("/api/books")
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({
      title: "Two User E2E Book",
      price: 500,
      usedLesson: "E2E演習",
      usedYear: 2026,
      usedFaculty: "経済学部",
      usedDepartment: "経済学科",
      targetYear: 1,
      materialType: "REQUIRED",
      category: "E2E",
    })
    .expect(201);
  const book = created.body.data;

  const page = await api
    .get("/api/books?page=1&pageSize=2")
    .set("Authorization", `Bearer ${buyerToken}`)
    .expect(200);
  assert.equal(page.body.data.items.length, 2);
  assert.equal(page.body.data.pagination.total, initialBookCount + 1);
  assert.equal(page.body.data.pagination.pageSize, 2);
  assert.ok(page.headers["x-request-id"]);
  assert.equal(page.headers["ratelimit-limit"], "180");

  const ownPurchase = await api
    .post("/api/transactions")
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({ bookId: book.id, offeredPrice: 500 })
    .expect(400);
  assert.equal(ownPurchase.body.error.code, "SELF_PURCHASE");

  const cancellable = await api
    .post("/api/books")
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({
      title: "Cancellable E2E Book",
      price: 600,
      usedLesson: "E2E取消演習",
      usedYear: 2026,
      materialType: "REFERENCE",
    })
    .expect(201);
  await api
    .delete(`/api/books/${cancellable.body.data.id}`)
    .set("Authorization", `Bearer ${buyerToken}`)
    .expect(403);
  const cancelled = await api
    .delete(`/api/books/${cancellable.body.data.id}`)
    .set("Authorization", `Bearer ${sellerToken}`)
    .expect(200);
  assert.equal(cancelled.body.data.status, "CANCELLED");

  const requested = await api
    .post("/api/transactions")
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({ bookId: book.id, offeredPrice: 500, message: "架空データだけのE2E相談" })
    .expect(201);
  const transactionId = requested.body.data.id;

  const buyerApproved = await api
    .patch(`/api/transactions/${transactionId}`)
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({ action: "APPROVE" })
    .expect(200);
  assert.equal(buyerApproved.body.data.status, "PENDING");

  const buyerRevoked = await api
    .patch(`/api/transactions/${transactionId}`)
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({ action: "REVOKE_APPROVAL" })
    .expect(200);
  assert.equal(buyerRevoked.body.data.status, "PENDING");
  assert.equal(buyerRevoked.body.data.buyerApproved, false);
  assert.equal(buyerRevoked.body.data.book.status, "NEGOTIATING");

  const duplicateRevoke = await api
    .patch(`/api/transactions/${transactionId}`)
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({ action: "REVOKE_APPROVAL" })
    .expect(409);
  assert.equal(duplicateRevoke.body.error.code, "APPROVAL_NOT_FOUND");

  await api
    .patch(`/api/transactions/${transactionId}`)
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({ action: "APPROVE" })
    .expect(200);

  const completed = await api
    .patch(`/api/transactions/${transactionId}`)
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({ action: "APPROVE" })
    .expect(200);
  assert.equal(completed.body.data.status, "COMPLETED");
  assert.equal(completed.body.data.book.status, "SOLD");

  const completedRevoke = await api
    .patch(`/api/transactions/${transactionId}`)
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({ action: "REVOKE_APPROVAL" })
    .expect(409);
  assert.equal(completedRevoke.body.error.code, "TRANSACTION_CLOSED");

  const completedCancel = await api
    .patch(`/api/transactions/${transactionId}`)
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({ action: "CANCEL_PURCHASE" })
    .expect(409);
  assert.equal(completedCancel.body.error.code, "TRANSACTION_CLOSED");

  const seller = await api
    .get("/api/users/me")
    .set("Authorization", `Bearer ${sellerToken}`)
    .expect(200);
  const buyer = await api
    .get("/api/users/me")
    .set("Authorization", `Bearer ${buyerToken}`)
    .expect(200);
  assert.equal(seller.body.data.pointBalance, 5500);
  assert.equal(buyer.body.data.pointBalance, 2700);

  const invalidPage = await api
    .get("/api/books?pageSize=51")
    .set("Authorization", `Bearer ${buyerToken}`)
    .expect(400);
  assert.equal(invalidPage.body.error.code, "VALIDATION_ERROR");

  await api
    .post("/api/demo/close")
    .type("form")
    .send({ clientId: firstOpen.body.data.clientId })
    .expect(200);
  assert.equal(ephemeralStore.stats().books, initialBookCount + 2);
  await api
    .post("/api/demo/close")
    .type("form")
    .send({ clientId: secondOpen.body.data.clientId })
    .expect(200);
  assert.equal(ephemeralStore.stats().books, initialBookCount);

  const health = await api.get("/api/health").expect(200);
  assert.equal(health.body.data.storage.status, "up");
  assert.equal(health.body.data.storage.probe, "SELECT 1");
});

test("purchase cancellation releases the book and pending purchase budget", async () => {
  ephemeralStore.reset();
  const api = request(createApp());
  const buyerSession = await api.post("/api/auth/session").send({ userId: 2 }).expect(201);
  const sellerSession = await api.post("/api/auth/session").send({ userId: 3 }).expect(201);
  const buyerToken = buyerSession.body.data.session.token;
  const sellerToken = sellerSession.body.data.session.token;
  const authorization = { Authorization: `Bearer ${buyerToken}` };
  const sellerAuthorization = { Authorization: `Bearer ${sellerToken}` };

  const books = await api
    .get("/api/books?page=1&pageSize=50")
    .set(authorization)
    .expect(200);
  const firstBook = books.body.data.items.find(
    (book) => book.title === "民法総則ケースブック",
  );
  const secondBook = books.body.data.items.find((book) => book.title === "憲法判例ガイド");
  assert.ok(firstBook);
  assert.ok(secondBook);

  const requested = await api
    .post("/api/transactions")
    .set(authorization)
    .send({ bookId: firstBook.id, offeredPrice: firstBook.price })
    .expect(201);
  const transactionId = requested.body.data.id;

  const rejected = await api
    .post("/api/transactions")
    .set(authorization)
    .send({ bookId: secondBook.id, offeredPrice: secondBook.price })
    .expect(409);
  assert.equal(rejected.body.error.code, "PURCHASE_BUDGET_EXCEEDED");
  assert.match(rejected.body.error.message, /合計が現在の残高を超えます/);

  const sellerApproved = await api
    .patch(`/api/transactions/${transactionId}`)
    .set(sellerAuthorization)
    .send({ action: "APPROVE" })
    .expect(200);
  assert.equal(sellerApproved.body.data.status, "PENDING");
  assert.equal(sellerApproved.body.data.sellerApproved, true);

  const sellerCancel = await api
    .patch(`/api/transactions/${transactionId}`)
    .set(sellerAuthorization)
    .send({ action: "CANCEL_PURCHASE" })
    .expect(403);
  assert.equal(sellerCancel.body.error.code, "FORBIDDEN");

  const cancelled = await api
    .patch(`/api/transactions/${transactionId}`)
    .set(authorization)
    .send({ action: "CANCEL_PURCHASE" })
    .expect(200);
  assert.equal(cancelled.body.data.status, "CANCELLED");
  assert.equal(cancelled.body.data.book.status, "AVAILABLE");

  const duplicateCancel = await api
    .patch(`/api/transactions/${transactionId}`)
    .set(authorization)
    .send({ action: "CANCEL_PURCHASE" })
    .expect(409);
  assert.equal(duplicateCancel.body.error.code, "TRANSACTION_CLOSED");

  const releasedBook = await api
    .get(`/api/books/${firstBook.id}`)
    .set(authorization)
    .expect(200);
  assert.equal(releasedBook.body.data.status, "AVAILABLE");

  await api
    .post("/api/transactions")
    .set(authorization)
    .send({ bookId: secondBook.id, offeredPrice: secondBook.price })
    .expect(201);

  const unchangedBuyer = await api
    .get("/api/users/me")
    .set(authorization)
    .expect(200);
  assert.equal(unchangedBuyer.body.data.pointBalance, 3200);

  const unchangedSeller = await api
    .get("/api/users/me")
    .set(sellerAuthorization)
    .expect(200);
  assert.equal(unchangedSeller.body.data.pointBalance, 4100);

  const secondBookAfterRequest = await api
    .get(`/api/books/${secondBook.id}`)
    .set(authorization)
    .expect(200);
  assert.equal(secondBookAfterRequest.body.data.status, "NEGOTIATING");
});
