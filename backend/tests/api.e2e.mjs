import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../dist/app.js";
import { ephemeralStore } from "../dist/lib/ephemeralStore.js";

test("two demo users share API data and complete a virtual-point trade", async () => {
  ephemeralStore.reset();
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
  assert.equal(page.body.data.pagination.total, 5);
  assert.equal(page.body.data.pagination.pageSize, 2);
  assert.ok(page.headers["x-request-id"]);
  assert.equal(page.headers["ratelimit-limit"], "180");

  const ownPurchase = await api
    .post("/api/transactions")
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({ bookId: book.id, offeredPrice: 500 })
    .expect(400);
  assert.equal(ownPurchase.body.error.code, "SELF_PURCHASE");

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

  const completed = await api
    .patch(`/api/transactions/${transactionId}`)
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({ action: "APPROVE" })
    .expect(200);
  assert.equal(completed.body.data.status, "COMPLETED");
  assert.equal(completed.body.data.book.status, "SOLD");

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
  assert.equal(ephemeralStore.stats().books, 5);
  await api
    .post("/api/demo/close")
    .type("form")
    .send({ clientId: secondOpen.body.data.clientId })
    .expect(200);
  assert.equal(ephemeralStore.stats().books, 4);

  const health = await api.get("/api/health").expect(200);
  assert.equal(health.body.data.storage.status, "up");
  assert.equal(health.body.data.storage.probe, "SELECT 1");
});
