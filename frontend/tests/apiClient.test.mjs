import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  approveTransaction,
  createComment,
  createDemoAccount,
  createListing,
  endDemoSession,
  getSession,
  listDemoUsers,
  listBooks,
  listComments,
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

test("a newly created demo account starts with 5000 points and no contact data", () => {
  const account = createDemoAccount({
    nickname: "Demo Newcomer",
    faculty: "文学部",
    department: "人文社会学科",
    year: 1,
  });

  assert.match(account.id, /^demo-user-created-/);
  assert.equal(account.accountType, "CREATED_DEMO");
  assert.equal(account.pointBalance, 5000);
  assert.equal(Object.hasOwn(account, "email"), false);
  assert.equal(Object.hasOwn(account, "phone"), false);
  assert.equal(Object.hasOwn(account, "address"), false);
  assert.equal(listDemoUsers().length, 6);

  const session = startDemoSession(account.id);
  assert.equal(session.userId, account.id);
  assert.equal(session.pointBalance, 5000);
});

test("demo account creation validates profile fields", () => {
  assert.throws(
    () => createDemoAccount({ nickname: "", faculty: "経済学部", year: 1 }),
    /ニックネーム/,
  );
  assert.throws(
    () => createDemoAccount({ nickname: "Demo", faculty: "対象外", year: 1 }),
    /学部/,
  );
  assert.throws(
    () => createDemoAccount({ nickname: "Demo", faculty: "経済学部", year: 9 }),
    /学年/,
  );
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

test("comments require a session and validate their body", () => {
  assert.throws(
    () => createComment("book-economics-2025", { body: "未認証コメント" }),
    /デモアカウントを選択/,
  );

  startDemoSession("demo-user-suzuki");
  assert.throws(() => createComment("book-economics-2025", { body: "   " }), /1〜240文字/);
  assert.throws(
    () => createComment("book-economics-2025", { body: "x".repeat(241) }),
    /1〜240文字/,
  );
  assert.deepEqual(listComments("book-economics-2025"), []);
});

test("book comments notify the seller and seller replies notify the commenter", () => {
  startDemoSession("demo-user-suzuki");
  const comment = createComment("book-economics-2025", {
    body: "書き込みの範囲を教えてください。<script>ignored</script>",
  });
  assert.equal(comment.authorId, "demo-user-suzuki");
  assert.equal(listComments("book-economics-2025").length, 1);
  assert.deepEqual(listNotifications(), []);

  startDemoSession("demo-user-kato");
  createComment("book-civil-law-2024", { body: "別の教科書への質問です。" });

  startDemoSession("demo-user-tanaka");
  const sellerNotifications = listNotifications();
  assert.equal(sellerNotifications.length, 1);
  assert.equal(sellerNotifications[0].type, "COMMENT");
  assert.equal(sellerNotifications[0].commentId, comment.id);
  createComment("book-economics-2025", { body: "第3章に少しだけあります。" });

  startDemoSession("demo-user-suzuki");
  const buyerNotifications = listNotifications();
  assert.equal(buyerNotifications.length, 1);
  assert.equal(buyerNotifications[0].type, "COMMENT");
  assert.equal(listComments("book-economics-2025").length, 2);

  startDemoSession("demo-user-kato");
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
  assert.equal(listNotifications()[0].type, "TRANSACTION_COMPLETED");

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
