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

  const completed = ephemeralStore.approveTransaction(book.sellerId, requested.id);
  assert.equal(completed.status, "COMPLETED");
  assert.equal(ephemeralStore.getBook(book.id).status, "SOLD");
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
