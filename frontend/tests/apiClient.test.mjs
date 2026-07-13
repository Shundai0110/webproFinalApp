import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  approveTransaction,
  createListing,
  endDemoSession,
  getSession,
  listDemoUsers,
  listBooks,
  listNotifications,
  listTransactions,
  requestPurchase,
  startDemoSession,
  updateProfile,
} from "../src/apiClient.js";

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  globalThis.sessionStorage = new MemoryStorage();
});

test("operations require an active demo session", () => {
  assert.equal(getSession().authenticated, false);
  assert.throws(
    () =>
      createListing({
        title: "未認証の出品",
        course: "テスト",
        usedYear: 2026,
        price: 100,
      }),
    /デモアカウントを選択/,
  );
  assert.throws(() => requestPurchase("book-economics-2025"), /デモアカウントを選択/);

  startDemoSession("demo-user-suzuki");
  const transaction = requestPurchase("book-economics-2025");
  endDemoSession();
  assert.throws(() => approveTransaction(transaction.id), /デモアカウントを選択/);
});

test("every authenticated user can list and purchase other users listings", () => {
  startDemoSession("demo-user-suzuki");
  const listing = createListing({
    title: "全ユーザーが出品可能",
    course: "認可テスト",
    faculty: "経済学部",
    usedYear: 2026,
    price: 100,
  });
  assert.equal(listing.sellerId, "demo-user-suzuki");
  assert.throws(() => requestPurchase(listing.id), /自分が出品した教科書は購入できません/);

  startDemoSession("demo-user-tanaka");
  const transaction = requestPurchase(listing.id);
  assert.equal(transaction.buyerId, "demo-user-tanaka");
});

test("virtual session can switch between multiple demo users", () => {
  assert.ok(listDemoUsers().length >= 3);

  const buyer = startDemoSession("demo-user-suzuki");
  assert.equal(buyer.authenticated, true);
  assert.equal(buyer.userId, "demo-user-suzuki");
  assert.match(buyer.sessionId, /^demo-session-/);
  assert.ok(Date.parse(buyer.expiresAt) > Date.now());

  const seller = startDemoSession("demo-user-tanaka");
  assert.equal(seller.userId, "demo-user-tanaka");
  assert.notEqual(seller.sessionId, buyer.sessionId);

  endDemoSession();
  assert.equal(getSession().authenticated, false);
});

test("a seller cannot purchase their own listing", () => {
  startDemoSession("demo-user-tanaka");
  assert.throws(
    () => requestPurchase("book-economics-2025"),
    /自分が出品した教科書は購入できません/,
  );
  assert.deepEqual(listTransactions(), []);
});

test("another demo user can request a purchase and only participants can view it", () => {
  startDemoSession("demo-user-suzuki");
  const transaction = requestPurchase("book-economics-2025");
  assert.equal(transaction.buyerId, "demo-user-suzuki");
  assert.equal(transaction.sellerId, "demo-user-tanaka");
  assert.equal(transaction.status, "PENDING");
  assert.equal(listTransactions().length, 1);

  startDemoSession("demo-user-tanaka");
  assert.equal(listTransactions().length, 1);

  startDemoSession("demo-user-sato");
  assert.equal(listTransactions().length, 0);
});

test("separate tab sessions can share marketplace data as different users", () => {
  const buyerTab = globalThis.sessionStorage;
  startDemoSession("demo-user-suzuki");
  requestPurchase("book-economics-2025");

  const sellerTab = new MemoryStorage();
  globalThis.sessionStorage = sellerTab;
  startDemoSession("demo-user-tanaka");
  assert.equal(getSession().userId, "demo-user-tanaka");
  assert.equal(listTransactions().length, 1);

  globalThis.sessionStorage = buyerTab;
  assert.equal(getSession().userId, "demo-user-suzuki");
  assert.equal(listTransactions().length, 1);
});

test("profile edits keep ownership tied to the stable user id", () => {
  startDemoSession("demo-user-sato");
  const profile = updateProfile({
    nickname: "Demo Editor",
    faculty: "文学部",
    department: "人文社会学科",
    year: 3,
  });
  assert.equal(profile.name, "Demo Editor");
  assert.equal(profile.faculty, "文学部");

  const listing = createListing({
    title: "プロフィール編集テスト",
    course: "デモ演習",
    faculty: "文学部",
    usedYear: 2026,
    price: 500,
    materialType: "REFERENCE",
  });
  assert.equal(listing.sellerId, "demo-user-sato");
  assert.equal(listing.sellerName, "Demo Editor");
  assert.throws(() => requestPurchase(listing.id), /自分が出品した教科書は購入できません/);
});

test("one approval keeps the transaction pending without moving points", () => {
  startDemoSession("demo-user-suzuki");
  const before = getSession().pointBalance;
  const transaction = requestPurchase("book-economics-2025");
  const updated = approveTransaction(transaction.id);

  assert.equal(updated.status, "PENDING");
  assert.equal(updated.buyerApproved, true);
  assert.equal(updated.sellerApproved, false);
  assert.equal(getSession().pointBalance, before);
  assert.equal(listBooks().find((book) => book.id === transaction.bookId).status, "NEGOTIATING");
  assert.deepEqual(listNotifications(), []);
});

test("insufficient demo points prevent a purchase request at the API boundary", () => {
  startDemoSession("demo-user-suzuki");
  const users = listDemoUsers();
  users.find((user) => user.id === "demo-user-suzuki").pointBalance = 100;
  globalThis.localStorage.setItem("keio-book-market.users.v5", JSON.stringify(users));

  assert.throws(() => requestPurchase("book-civil-law-2024"), /残高が不足/);
  assert.equal(listBooks().find((book) => book.id === "book-civil-law-2024").status, "AVAILABLE");
  assert.deepEqual(listTransactions(), []);
});

test("both approvals complete the trade and move demo points once", () => {
  startDemoSession("demo-user-suzuki");
  const transaction = requestPurchase("book-economics-2025");
  approveTransaction(transaction.id);

  startDemoSession("demo-user-tanaka");
  const completed = approveTransaction(transaction.id);
  assert.equal(completed.status, "COMPLETED");
  assert.equal(completed.buyerApproved, true);
  assert.equal(completed.sellerApproved, true);
  assert.deepEqual(completed.pointTransfer, { amount: 1200, unit: "DEMO_POINT" });
  assert.equal(getSession().pointBalance, 4400);
  assert.equal(listBooks().find((book) => book.id === transaction.bookId).status, "SOLD");
  assert.equal(listNotifications().length, 1);

  const sellerBalance = getSession().pointBalance;
  assert.throws(() => approveTransaction(transaction.id), /すでに終了/);
  assert.equal(getSession().pointBalance, sellerBalance);

  startDemoSession("demo-user-suzuki");
  assert.equal(getSession().pointBalance, 3800);
  assert.equal(listNotifications().length, 1);
});

test("an unrelated user cannot approve a transaction", () => {
  startDemoSession("demo-user-suzuki");
  const transaction = requestPurchase("book-economics-2025");

  startDemoSession("demo-user-sato");
  assert.throws(() => approveTransaction(transaction.id), /承諾する権限がありません/);
  assert.deepEqual(listTransactions(), []);
  assert.deepEqual(listNotifications(), []);
});

test("insufficient demo points prevent buyer approval and completion", () => {
  startDemoSession("demo-user-suzuki");
  const transaction = requestPurchase("book-civil-law-2024");

  startDemoSession("demo-user-sato");
  const sellerApproved = approveTransaction(transaction.id);
  assert.equal(sellerApproved.sellerApproved, true);

  const users = listDemoUsers();
  users.find((user) => user.id === "demo-user-suzuki").pointBalance = 100;
  globalThis.localStorage.setItem("keio-book-market.users.v5", JSON.stringify(users));

  startDemoSession("demo-user-suzuki");
  assert.throws(() => approveTransaction(transaction.id), /残高が不足/);
  const pending = listTransactions().find((candidate) => candidate.id === transaction.id);
  assert.equal(pending.status, "PENDING");
  assert.equal(pending.buyerApproved, false);
  assert.equal(pending.sellerApproved, true);
  assert.equal(listBooks().find((book) => book.id === transaction.bookId).status, "NEGOTIATING");
});
