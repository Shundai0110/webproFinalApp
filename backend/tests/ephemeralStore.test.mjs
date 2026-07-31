import assert from "node:assert/strict";
import test from "node:test";
import { ephemeralStore } from "../dist/lib/ephemeralStore.js";
import {
  closeDemoClient,
  openDemoClient,
  resetEphemeralDemo,
} from "../dist/services/ephemeralLifecycle.js";

test("ephemeral database enforces trade rules and resets all runtime changes", () => {
  ephemeralStore.reset();
  const initial = ephemeralStore.stats();
  assert.equal(initial.books, 8);
  assert.ok(ephemeralStore.listBooks().some((book) => book.title === "Pythonデータ分析入門"));
  const book = ephemeralStore.listBooks({ status: "AVAILABLE" })[0];
  const sellerBefore = ephemeralStore.getUser(book.sellerId);
  const buyerBefore = ephemeralStore
    .listUsers()
    .find((user) => user.id !== book.sellerId && user.pointBalance >= book.price);

  assert.ok(book);
  assert.ok(sellerBefore);
  assert.ok(buyerBefore);
  assert.throws(
    () => ephemeralStore.requestTransaction(book.sellerId, book.id, book.price),
    /自分の出品は購入できません/,
  );

  const requested = ephemeralStore.requestTransaction(
    buyerBefore.id,
    book.id,
    book.price,
    "架空データだけを使うデモ購入相談",
  );
  const buyerApproved = ephemeralStore.approveTransaction(buyerBefore.id, requested.id);
  assert.equal(buyerApproved.status, "PENDING");
  assert.equal(buyerApproved.buyerApproved, true);

  const buyerRevoked = ephemeralStore.revokeTransactionApproval(
    buyerBefore.id,
    requested.id,
  );
  assert.equal(buyerRevoked.status, "PENDING");
  assert.equal(buyerRevoked.buyerApproved, false);
  assert.equal(buyerRevoked.book.status, "NEGOTIATING");
  assert.throws(
    () => ephemeralStore.revokeTransactionApproval(buyerBefore.id, requested.id),
    /取り消し済み/,
  );
  ephemeralStore.approveTransaction(buyerBefore.id, requested.id);

  const completed = ephemeralStore.approveTransaction(book.sellerId, requested.id);
  assert.equal(completed.status, "COMPLETED");
  assert.equal(ephemeralStore.getBook(book.id).status, "SOLD");
  assert.throws(
    () => ephemeralStore.revokeTransactionApproval(buyerBefore.id, requested.id),
    /成立済み/,
  );
  assert.equal(
    ephemeralStore.getUser(buyerBefore.id).pointBalance,
    buyerBefore.pointBalance - book.price,
  );
  assert.equal(
    ephemeralStore.getUser(book.sellerId).pointBalance,
    sellerBefore.pointBalance + book.price,
  );

  const notificationCount = ephemeralStore.stats().notifications;
  ephemeralStore.createComment(book.id, buyerBefore.id, "架空データだけを使う質問です");
  assert.equal(ephemeralStore.stats().comments, 1);
  assert.ok(ephemeralStore.stats().notifications > notificationCount);

  ephemeralStore.reset();
  assert.ok(ephemeralStore.stats().generation > initial.generation);
  assert.deepEqual(
    {
      users: ephemeralStore.stats().users,
      books: ephemeralStore.stats().books,
      transactions: ephemeralStore.stats().transactions,
      comments: ephemeralStore.stats().comments,
      notifications: ephemeralStore.stats().notifications,
    },
    {
      users: initial.users,
      books: initial.books,
      transactions: initial.transactions,
      comments: initial.comments,
      notifications: initial.notifications,
    },
  );

  const firstClient = openDemoClient();
  const secondClient = openDemoClient();
  assert.throws(() => resetEphemeralDemo(), /他のブラウザが利用中/);
  closeDemoClient(firstClient.clientId);

  ephemeralStore.createUser({
    nickname: "Temporary User",
    faculty: "文学部",
    department: "人文社会学科",
    year: 1,
  });
  assert.equal(ephemeralStore.stats().users, initial.users + 1);
  closeDemoClient(secondClient.clientId);
  assert.equal(ephemeralStore.stats().users, initial.users);
});

test("ephemeral database rejects purchase requests whose pending total exceeds balance", () => {
  ephemeralStore.reset();
  const buyer = ephemeralStore.getUser(2);
  const firstBook = ephemeralStore
    .listBooks({ status: "AVAILABLE" })
    .find((book) => book.title === "民法総則ケースブック");
  const secondBook = ephemeralStore
    .listBooks({ status: "AVAILABLE" })
    .find((book) => book.title === "憲法判例ガイド");

  assert.ok(buyer);
  assert.ok(firstBook);
  assert.ok(secondBook);
  assert.equal(buyer.pointBalance, 3200);

  const firstRequest = ephemeralStore.requestTransaction(
    buyer.id,
    firstBook.id,
    firstBook.price,
  );
  assert.throws(
    () => ephemeralStore.requestTransaction(buyer.id, secondBook.id, secondBook.price),
    (error) => {
      assert.equal(error.code, "PURCHASE_BUDGET_EXCEEDED");
      assert.match(error.message, /合計が現在の残高を超えます/);
      return true;
    },
  );
  assert.equal(ephemeralStore.getBook(secondBook.id).status, "AVAILABLE");

  const sellerApproved = ephemeralStore.approveTransaction(firstBook.sellerId, firstRequest.id);
  assert.equal(sellerApproved.sellerApproved, true);
  assert.throws(
    () => ephemeralStore.cancelPurchaseRequest(firstBook.sellerId, firstRequest.id),
    /購入者だけが購入申請を取り消せます/,
  );

  const cancelled = ephemeralStore.cancelPurchaseRequest(buyer.id, firstRequest.id);
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.book.status, "AVAILABLE");
  assert.equal(ephemeralStore.getUser(buyer.id).pointBalance, buyer.pointBalance);
  assert.throws(
    () => ephemeralStore.cancelPurchaseRequest(buyer.id, firstRequest.id),
    /すでに終了しています/,
  );

  const requestAfterCancellation = ephemeralStore.requestTransaction(
    buyer.id,
    secondBook.id,
    secondBook.price,
  );
  assert.equal(requestAfterCancellation.status, "PENDING");
  ephemeralStore.reset();
});
