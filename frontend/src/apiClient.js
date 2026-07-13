import { faculties, seedBooks, seedDemoUsers } from "./data.js";

const STORAGE_VERSION = "v5";
const BOOKS_KEY = `keio-book-market.books.${STORAGE_VERSION}`;
const TRANSACTIONS_KEY = `keio-book-market.transactions.${STORAGE_VERSION}`;
const USERS_KEY = `keio-book-market.users.${STORAGE_VERSION}`;
const NOTIFICATIONS_KEY = `keio-book-market.notifications.${STORAGE_VERSION}`;
const SESSION_KEY = `keio-book-market.session.${STORAGE_VERSION}`;
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(key, fallback) {
  if (!globalThis.localStorage) {
    return clone(fallback);
  }

  const raw = globalThis.localStorage.getItem(key);
  if (!raw) {
    const seeded = clone(fallback);
    globalThis.localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(raw);
  } catch {
    globalThis.localStorage.removeItem(key);
    return clone(fallback);
  }
}

function getSessionStore() {
  return globalThis.sessionStorage ?? globalThis.localStorage;
}

function readOptionalJson(key, storage = globalThis.localStorage) {
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function writeJson(key, value) {
  if (!globalThis.localStorage) return;
  globalThis.localStorage.setItem(key, JSON.stringify(value));
}

function writeJsonBatch(entries) {
  if (!globalThis.localStorage) return;
  const snapshots = entries.map(([key]) => [key, globalThis.localStorage.getItem(key)]);

  try {
    entries.forEach(([key, value]) => {
      globalThis.localStorage.setItem(key, JSON.stringify(value));
    });
  } catch (error) {
    // localStorage はDBトランザクションを持たないため、失敗時は更新前の値へ戻す。
    snapshots.forEach(([key, value]) => {
      if (value === null) globalThis.localStorage.removeItem(key);
      else globalThis.localStorage.setItem(key, value);
    });
    throw error;
  }
}

function writeSession(value) {
  const storage = getSessionStore();
  if (!storage) return;
  storage.setItem(SESSION_KEY, JSON.stringify(value));
}

function createId(prefix) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${randomId}`;
}

function anonymousSession() {
  return {
    authenticated: false,
    sessionId: null,
    userId: null,
    name: "未選択",
    faculty: "",
    department: "",
    year: null,
    pointBalance: 0,
    avatar: "?",
    expiresAt: null,
  };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesSearch(book, query) {
  const term = normalizeText(query);
  if (!term) return true;

  return [book.title, book.course, book.faculty, book.department, book.description]
    .map(normalizeText)
    .some((value) => value.includes(term));
}

function calculateRelatedScore(book, query, session) {
  let score = 0;
  const term = normalizeText(query.search);

  if (term && normalizeText(book.title).includes(term)) score += 40;
  if (term && normalizeText(book.course).includes(term)) score += 30;
  if (session.authenticated && book.faculty === session.faculty) score += 15;
  if (session.authenticated && book.department === session.department) score += 15;
  if (session.authenticated && book.targetYear === session.year) score += 10;
  if (book.materialType === "REQUIRED") score += 5;
  if (book.status === "AVAILABLE") score += 3;

  return score;
}

function requireSession() {
  // 画面の disabled 状態は改変できるため、更新処理の入口で毎回セッションを検証する。
  const session = getSession();
  if (!session.authenticated) {
    throw new Error("デモアカウントを選択して利用を開始してください");
  }
  return session;
}

function readDemoUsers() {
  const storedProfiles = readJson(USERS_KEY, seedDemoUsers);

  // デモ定義に存在するIDだけを有効にし、プロフィール改変によるアカウント追加を防ぐ。
  return storedProfiles
    .map((profile) => {
      const account = seedDemoUsers.find((candidate) => candidate.id === profile.id);
      return account ? profile : null;
    })
    .filter(Boolean);
}

export function listDemoUsers() {
  return clone(readDemoUsers());
}

export function getSession() {
  const sessionStore = getSessionStore();
  const storedSession = readOptionalJson(SESSION_KEY, sessionStore);
  if (!storedSession) return anonymousSession();

  const expiresAt = Date.parse(storedSession.expiresAt);
  const user = readDemoUsers().find((candidate) => candidate.id === storedSession.userId);

  if (!user || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    sessionStore?.removeItem(SESSION_KEY);
    return anonymousSession();
  }

  return {
    authenticated: true,
    sessionId: storedSession.sessionId,
    userId: user.id,
    name: user.nickname,
    faculty: user.faculty,
    department: user.department,
    year: user.year,
    pointBalance: user.pointBalance,
    avatar: user.avatar,
    expiresAt: storedSession.expiresAt,
  };
}

export function startDemoSession(userId) {
  const user = readDemoUsers().find((candidate) => candidate.id === userId);
  if (!user) {
    throw new Error("選択したデモアカウントが見つかりません");
  }

  // 外部認証や実在資格情報を使わず、タブ単位で期限付きIDだけを保持する仮想セッション。
  const now = Date.now();
  writeSession({
    sessionId: createId("demo-session"),
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_DURATION_MS).toISOString(),
  });

  return getSession();
}

export function endDemoSession() {
  getSessionStore()?.removeItem(SESSION_KEY);
  return anonymousSession();
}

export function updateProfile(input) {
  const session = requireSession();
  const nickname = String(input.nickname || "").trim();
  const faculty = String(input.faculty || "").trim();
  const department = String(input.department || "").trim();
  const year = Number(input.year);

  if (!nickname || nickname.length > 40) {
    throw new Error("ニックネームは1〜40文字で入力してください");
  }
  if (!faculties.includes(faculty)) {
    throw new Error("学部を選択してください");
  }
  if (department.length > 40) {
    throw new Error("学科・専攻は40文字以内で入力してください");
  }
  if (!Number.isInteger(year) || year < 1 || year > 6) {
    throw new Error("学年を正しく選択してください");
  }

  const users = readDemoUsers();
  const user = users.find((candidate) => candidate.id === session.userId);
  user.nickname = nickname;
  user.faculty = faculty;
  user.department = department;
  user.year = year;
  user.avatar = nickname.slice(0, 1).toUpperCase();
  writeJson(USERS_KEY, users);

  // 表示用の名前は更新するが、所有権判定は変更不能な userId のまま維持する。
  const books = readJson(BOOKS_KEY, seedBooks);
  books.forEach((book) => {
    if (book.sellerId === user.id) book.sellerName = nickname;
  });
  writeJson(BOOKS_KEY, books);

  const transactions = readJson(TRANSACTIONS_KEY, []);
  transactions.forEach((transaction) => {
    if (transaction.buyerId === user.id) transaction.buyerName = nickname;
    if (transaction.sellerId === user.id) transaction.sellerName = nickname;
  });
  writeJson(TRANSACTIONS_KEY, transactions);

  return getSession();
}

export function listBooks(filters = {}) {
  const books = readJson(BOOKS_KEY, seedBooks);
  const session = getSession();

  return books
    .filter((book) => matchesSearch(book, filters.search))
    .filter((book) => !filters.faculty || book.faculty === filters.faculty)
    .filter((book) => !filters.status || book.status === filters.status)
    .map((book) => ({
      ...book,
      relatedScore: calculateRelatedScore(book, filters, session),
    }))
    .sort((a, b) => b.relatedScore - a.relatedScore || b.usedYear - a.usedYear);
}

export function listTransactions() {
  const session = getSession();
  if (!session.authenticated) return [];

  return readJson(TRANSACTIONS_KEY, []).filter(
    (transaction) =>
      transaction.buyerId === session.userId || transaction.sellerId === session.userId,
  );
}

export function listNotifications() {
  const session = getSession();
  if (!session.authenticated) return [];

  return readJson(NOTIFICATIONS_KEY, []).filter(
    (notification) => notification.userId === session.userId,
  );
}

export function createListing(input) {
  const session = requireSession();
  const books = readJson(BOOKS_KEY, seedBooks);
  const title = String(input.title || "").trim();
  const course = String(input.course || "").trim();
  const price = Number(input.price);
  const usedYear = Number(input.usedYear);

  if (!title || !course) {
    throw new Error("教科書名と授業名を入力してください");
  }
  if (!Number.isInteger(price) || price < 0) {
    throw new Error("価格は0以上の整数で入力してください");
  }
  if (!Number.isInteger(usedYear) || usedYear < 2000 || usedYear > 2100) {
    throw new Error("使用年度を正しく入力してください");
  }

  const book = {
    id: createId("book"),
    title,
    course,
    faculty: String(input.faculty || session.faculty),
    department: session.department,
    targetYear: session.year,
    usedYear,
    materialType: input.materialType === "REFERENCE" ? "REFERENCE" : "REQUIRED",
    price,
    condition: "出品者メモ",
    status: "AVAILABLE",
    sellerId: session.userId,
    sellerName: session.name,
    imageUrl: "assets/book-generic.svg",
    description: String(input.description || "").trim() || "状態メモは未入力です。",
  };

  books.unshift(book);
  writeJson(BOOKS_KEY, books);
  return clone(book);
}

export function requestPurchase(bookId) {
  const session = requireSession();
  const books = readJson(BOOKS_KEY, seedBooks);
  const target = books.find((book) => book.id === bookId);

  if (!target) {
    throw new Error("対象の教科書が見つかりません");
  }
  if (target.status !== "AVAILABLE") {
    throw new Error("この教科書は現在購入相談を開始できません");
  }
  // 表示名は編集可能なため、自己購入の認可判定には必ず安定したIDを使う。
  if (target.sellerId === session.userId) {
    throw new Error("自分が出品した教科書は購入できません");
  }
  if (!Number.isInteger(session.pointBalance) || session.pointBalance < target.price) {
    throw new Error("仮想ポイント残高が不足しています");
  }

  target.status = "NEGOTIATING";
  const transactions = readJson(TRANSACTIONS_KEY, []);
  const transaction = {
    id: createId("transaction"),
    bookId: target.id,
    bookTitle: target.title,
    buyerId: session.userId,
    buyerName: session.name,
    sellerId: target.sellerId,
    sellerName: target.sellerName,
    offeredPrice: target.price,
    buyerApproved: false,
    sellerApproved: false,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  transactions.unshift(transaction);
  // UIを経由しない呼び出しでも、交渉中への変更と相談作成を片方だけ残さない。
  writeJsonBatch([
    [BOOKS_KEY, books],
    [TRANSACTIONS_KEY, transactions],
  ]);
  return clone(transaction);
}

export function approveTransaction(transactionId) {
  const session = requireSession();
  const users = readDemoUsers();
  const books = readJson(BOOKS_KEY, seedBooks);
  const transactions = readJson(TRANSACTIONS_KEY, []);
  const notifications = readJson(NOTIFICATIONS_KEY, []);
  const transaction = transactions.find((candidate) => candidate.id === transactionId);

  if (!transaction) {
    throw new Error("対象の取引が見つかりません");
  }
  if (transaction.status !== "PENDING") {
    throw new Error("この取引はすでに終了しています");
  }

  const isBuyer = transaction.buyerId === session.userId;
  const isSeller = transaction.sellerId === session.userId;
  if (!isBuyer && !isSeller) {
    throw new Error("この取引を承諾する権限がありません");
  }

  const buyer = users.find((user) => user.id === transaction.buyerId);
  const seller = users.find((user) => user.id === transaction.sellerId);
  const book = books.find((candidate) => candidate.id === transaction.bookId);
  if (!buyer || !seller || !book) {
    throw new Error("取引に必要なデモデータが見つかりません");
  }
  if (book.status !== "NEGOTIATING") {
    throw new Error("対象の教科書は取引中ではありません");
  }
  if (!Number.isInteger(transaction.offeredPrice) || transaction.offeredPrice < 0) {
    throw new Error("仮想ポイント価格が不正です");
  }
  if (
    !Number.isInteger(buyer.pointBalance) ||
    buyer.pointBalance < 0 ||
    !Number.isInteger(seller.pointBalance) ||
    seller.pointBalance < 0
  ) {
    throw new Error("仮想ポイント残高が不正です");
  }
  if (isBuyer && buyer.pointBalance < transaction.offeredPrice) {
    throw new Error("仮想ポイント残高が不足しています");
  }

  const approvalKey = isBuyer ? "buyerApproved" : "sellerApproved";
  if (transaction[approvalKey]) {
    throw new Error("このアカウントはすでに承諾しています");
  }

  transaction[approvalKey] = true;
  transaction.updatedAt = new Date().toISOString();

  if (!transaction.buyerApproved || !transaction.sellerApproved) {
    writeJson(TRANSACTIONS_KEY, transactions);
    return clone(transaction);
  }

  if (buyer.pointBalance < transaction.offeredPrice) {
    throw new Error("仮想ポイント残高が不足しています");
  }

  // 双方承諾が揃った時だけ、換金不能なデモポイントと取引状態を同時に確定する。
  buyer.pointBalance -= transaction.offeredPrice;
  seller.pointBalance += transaction.offeredPrice;
  transaction.status = "COMPLETED";
  transaction.completedAt = new Date().toISOString();
  transaction.pointTransfer = {
    amount: transaction.offeredPrice,
    unit: "DEMO_POINT",
  };
  book.status = "SOLD";

  const notificationBase = {
    transactionId: transaction.id,
    bookId: book.id,
    createdAt: transaction.completedAt,
    read: false,
  };
  notifications.unshift(
    {
      ...notificationBase,
      id: createId("notification"),
      userId: buyer.id,
      message: `${book.title} の取引が完了し、${transaction.offeredPrice.toLocaleString(
        "ja-JP",
      )} pt を支払いました`,
    },
    {
      ...notificationBase,
      id: createId("notification"),
      userId: seller.id,
      message: `${book.title} の取引が完了し、${transaction.offeredPrice.toLocaleString(
        "ja-JP",
      )} pt を受け取りました`,
    },
  );

  // backend 実装時は、この一括更新を必ずDBトランザクションへ置き換える。
  writeJsonBatch([
    [USERS_KEY, users],
    [BOOKS_KEY, books],
    [TRANSACTIONS_KEY, transactions],
    [NOTIFICATIONS_KEY, notifications],
  ]);

  return clone(transaction);
}

export function resetDemoData() {
  if (!globalThis.localStorage) return;
  [BOOKS_KEY, TRANSACTIONS_KEY, USERS_KEY, NOTIFICATIONS_KEY].forEach((key) => {
    globalThis.localStorage.removeItem(key);
  });
  getSessionStore()?.removeItem(SESSION_KEY);
}
