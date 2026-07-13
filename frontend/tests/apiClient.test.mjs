import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  createListing,
  endDemoSession,
  getSession,
  listDemoUsers,
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
});

test("authenticated users are limited by their demo roles", () => {
  startDemoSession("demo-user-suzuki");
  assert.throws(
    () =>
      createListing({
        title: "購入者による出品",
        course: "権限テスト",
        faculty: "経済学部",
        usedYear: 2026,
        price: 100,
      }),
    /出品者ロール/,
  );

  startDemoSession("demo-user-tanaka");
  assert.throws(() => requestPurchase("book-civil-law-2024"), /購入者ロール/);
});

test("profile storage cannot be used to elevate demo roles", () => {
  const users = listDemoUsers();
  users.find((user) => user.id === "demo-user-suzuki").roles.push("SELLER");
  globalThis.localStorage.setItem("keio-book-market.users.v3", JSON.stringify(users));

  const session = startDemoSession("demo-user-suzuki");
  assert.deepEqual(session.roles, ["BUYER"]);
  assert.throws(
    () =>
      createListing({
        title: "不正な権限昇格",
        course: "権限テスト",
        faculty: "経済学部",
        usedYear: 2026,
        price: 100,
      }),
    /出品者ロール/,
  );
});

test("seller and buyer roles allow their respective operations", () => {
  startDemoSession("demo-user-tanaka");
  const listing = createListing({
    title: "出品者ロールの教科書",
    course: "権限テスト",
    faculty: "経済学部",
    usedYear: 2026,
    price: 300,
  });
  assert.equal(listing.sellerId, "demo-user-tanaka");

  startDemoSession("demo-user-suzuki");
  const transaction = requestPurchase(listing.id);
  assert.equal(transaction.buyerId, "demo-user-suzuki");
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
