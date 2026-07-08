import { demoSession, seedBooks } from "./data.js";

const BOOKS_KEY = "keio-book-market.books.v1";
const TRANSACTIONS_KEY = "keio-book-market.transactions.v1";

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

function writeJson(key, value) {
  if (!globalThis.localStorage) {
    return;
  }

  globalThis.localStorage.setItem(key, JSON.stringify(value));
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

function calculateRelatedScore(book, query) {
  let score = 0;
  const term = normalizeText(query.search);

  if (term && normalizeText(book.title).includes(term)) score += 40;
  if (term && normalizeText(book.course).includes(term)) score += 30;
  if (book.faculty === demoSession.faculty) score += 15;
  if (book.department === demoSession.department) score += 15;
  if (book.targetYear === demoSession.year) score += 10;
  if (book.materialType === "REQUIRED") score += 5;
  if (book.status === "AVAILABLE") score += 3;

  return score;
}

export function getSession() {
  return clone(demoSession);
}

export function listBooks(filters = {}) {
  const books = readJson(BOOKS_KEY, seedBooks);

  return books
    .filter((book) => matchesSearch(book, filters.search))
    .filter((book) => !filters.faculty || book.faculty === filters.faculty)
    .filter((book) => !filters.status || book.status === filters.status)
    .map((book) => ({
      ...book,
      relatedScore: calculateRelatedScore(book, filters),
    }))
    .sort((a, b) => b.relatedScore - a.relatedScore || b.usedYear - a.usedYear);
}

export function listTransactions() {
  return readJson(TRANSACTIONS_KEY, []);
}

export function createListing(input) {
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

  if (!Number.isInteger(usedYear) || usedYear < 2000) {
    throw new Error("使用年度を正しく入力してください");
  }

  const book = {
    id: `book-${Date.now()}`,
    title,
    course,
    faculty: String(input.faculty || "未設定"),
    department: "",
    targetYear: demoSession.year,
    usedYear,
    materialType: input.materialType === "REFERENCE" ? "REFERENCE" : "REQUIRED",
    price,
    condition: "出品者メモ",
    status: "AVAILABLE",
    sellerName: demoSession.name,
    imageUrl: "assets/book-generic.svg",
    description: String(input.description || "").trim() || "状態メモは未入力です。",
  };

  books.unshift(book);
  writeJson(BOOKS_KEY, books);
  return clone(book);
}

export function requestPurchase(bookId) {
  const books = readJson(BOOKS_KEY, seedBooks);
  const target = books.find((book) => book.id === bookId);

  if (!target) {
    throw new Error("対象の教科書が見つかりません");
  }

  if (target.status !== "AVAILABLE") {
    throw new Error("この教科書は現在購入相談を開始できません");
  }

  target.status = "NEGOTIATING";
  writeJson(BOOKS_KEY, books);

  const transactions = readJson(TRANSACTIONS_KEY, []);
  const transaction = {
    id: `transaction-${Date.now()}`,
    bookId: target.id,
    bookTitle: target.title,
    buyerName: demoSession.name,
    sellerName: target.sellerName,
    offeredPrice: target.price,
    buyerApproved: false,
    sellerApproved: false,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  transactions.unshift(transaction);
  writeJson(TRANSACTIONS_KEY, transactions);
  return clone(transaction);
}

export function resetDemoData() {
  if (globalThis.localStorage) {
    globalThis.localStorage.removeItem(BOOKS_KEY);
    globalThis.localStorage.removeItem(TRANSACTIONS_KEY);
  }
}
