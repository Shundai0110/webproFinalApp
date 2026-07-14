const TOKEN_KEY = "keio-book-demo.api-token.v1";
const EXPIRES_KEY = "keio-book-demo.api-token-expires.v1";
const CLIENT_KEY = "keio-book-demo.client-id.v1";

function defaultApiBase() {
  if (typeof location === "undefined") return "http://127.0.0.1:4000/api";
  if (location.hostname === "127.0.0.1" && location.port === "4173") {
    return "http://127.0.0.1:4000/api";
  }
  return `${location.origin}/api`;
}

const API_BASE = globalThis.__KEIO_BOOK_API_BASE__ || defaultApiBase();
const cache = {
  users: [],
  books: [],
  transactions: [],
  notifications: [],
  comments: [],
  session: anonymousSession(),
};

let heartbeatTimer = 0;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pageItems(value) {
  return Array.isArray(value) ? value : value?.items || [];
}

function sessionStore() {
  return globalThis.sessionStorage;
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

function mapUser(user) {
  return {
    id: String(user.id),
    demoUserKey: user.demoUserKey,
    nickname: user.nickname,
    faculty: user.faculty,
    department: user.department || "",
    year: Number(user.year),
    pointBalance: Number(user.pointBalance),
    avatar: String(user.nickname || "?").slice(0, 1).toUpperCase(),
    iconUrl: user.iconUrl || null,
  };
}

function mapBook(book) {
  return {
    id: String(book.id),
    title: book.title,
    course: book.usedLesson,
    faculty: book.usedFaculty || "学部未設定",
    department: book.usedDepartment || "",
    targetYear: book.targetYear,
    usedYear: Number(book.usedYear),
    materialType: book.materialType,
    price: Number(book.price),
    condition: "出品者メモ",
    status: book.status,
    sellerId: String(book.sellerId),
    sellerName: book.seller?.nickname || "デモ出品者",
    imageUrl: book.imageUrl || "/assets/book-generic.svg",
    description: book.description || "状態メモは未入力です。",
    relatedScore: Number(book.relatedScore || 0),
  };
}

function mapTransaction(transaction) {
  return {
    id: String(transaction.id),
    bookId: String(transaction.bookId),
    bookTitle: transaction.book?.title || "教科書",
    buyerId: String(transaction.buyerId),
    buyerName: transaction.buyer?.nickname || "デモ購入者",
    sellerId: String(transaction.sellerId),
    sellerName: transaction.seller?.nickname || "デモ出品者",
    offeredPrice: Number(transaction.offeredPrice),
    buyerApproved: Boolean(transaction.buyerApproved),
    sellerApproved: Boolean(transaction.sellerApproved),
    status: transaction.status,
    createdAt: transaction.createdAt,
    completedAt: transaction.completedAt || null,
    pointTransfer:
      transaction.status === "COMPLETED"
        ? { amount: Number(transaction.offeredPrice), unit: "DEMO_POINT" }
        : undefined,
  };
}

function mapComment(comment) {
  return {
    id: String(comment.id),
    bookId: String(comment.bookId),
    authorId: String(comment.authorId),
    authorName: comment.authorName,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

function token() {
  return sessionStore()?.getItem(TOKEN_KEY) || "";
}

function clearToken() {
  sessionStore()?.removeItem(TOKEN_KEY);
  sessionStore()?.removeItem(EXPIRES_KEY);
  cache.session = anonymousSession();
}

async function request(path, { method = "GET", body, authenticated = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authenticated && token()) headers.Authorization = `Bearer ${token()}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("デモAPIへ接続できません。backendの起動を確認してください");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    if (response.status === 401) clearToken();
    const error = new Error(payload?.error?.message || `APIエラー (${response.status})`);
    error.code = payload?.error?.code;
    throw error;
  }
  return payload.data;
}

function setAuthenticatedSession(user, session) {
  const profile = mapUser(user);
  if (session?.token) sessionStore()?.setItem(TOKEN_KEY, session.token);
  if (session?.expiresAt) sessionStore()?.setItem(EXPIRES_KEY, session.expiresAt);
  cache.session = {
    authenticated: true,
    sessionId: token().slice(-16),
    userId: profile.id,
    name: profile.nickname,
    faculty: profile.faculty,
    department: profile.department,
    year: profile.year,
    pointBalance: profile.pointBalance,
    avatar: profile.avatar,
    expiresAt: session?.expiresAt || sessionStore()?.getItem(EXPIRES_KEY),
  };
  return cache.session;
}

async function refreshAccounts() {
  cache.users = (await request("/auth/accounts", { authenticated: false })).map(mapUser);
}

async function refreshMarketplace() {
  if (!cache.session.authenticated) {
    cache.books = [];
    cache.transactions = [];
    cache.notifications = [];
    cache.comments = [];
    return;
  }
  const [books, transactions, notifications, comments, ownProfile] = await Promise.all([
    request("/books?page=1&pageSize=50"),
    request("/transactions?page=1&pageSize=50"),
    request("/notifications?page=1&pageSize=50"),
    request("/comments?page=1&pageSize=50"),
    request("/users/me"),
  ]);
  cache.books = pageItems(books).map(mapBook);
  cache.transactions = pageItems(transactions).map(mapTransaction);
  cache.notifications = pageItems(notifications).map((notification) => ({
    ...notification,
    id: String(notification.id),
    userId: String(notification.userId),
  }));
  cache.comments = pageItems(comments).map(mapComment);
  setAuthenticatedSession(ownProfile);
  await refreshAccounts();
}

async function openEphemeralDatabase() {
  const lifecycle = await request("/demo/open", {
    method: "POST",
    body: {},
    authenticated: false,
  });
  sessionStore()?.setItem(CLIENT_KEY, lifecycle.clientId);

  if (typeof window !== "undefined") {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = window.setInterval(() => {
      request("/demo/heartbeat", {
        method: "POST",
        body: { clientId: lifecycle.clientId },
        authenticated: false,
      }).catch(() => {});
    }, 30_000);

    window.addEventListener(
      "pagehide",
      (event) => {
        // Back/Forward Cacheへの退避は終了ではないため、復帰後もheartbeatを継続する。
        if (event.persisted) return;
        window.clearInterval(heartbeatTimer);
        const body = new URLSearchParams({ clientId: lifecycle.clientId });
        navigator.sendBeacon?.(`${API_BASE}/demo/close`, body);
      },
    );
  }
  return lifecycle;
}

export async function initializeApi() {
  await openEphemeralDatabase();
  await refreshAccounts();

  if (token()) {
    try {
      const profile = await request("/users/me");
      setAuthenticatedSession(profile);
    } catch {
      clearToken();
    }
  }

  // 外部認証を持たない展示用アプリなので、初回は先頭の架空アカウントを自動選択する。
  if (!cache.session.authenticated && cache.users[0]) {
    await startDemoSession(cache.users[0].id);
  } else {
    await refreshMarketplace();
  }
  return { session: getSession(), users: listDemoUsers() };
}

export function getSession() {
  return clone(cache.session);
}

export function listDemoUsers() {
  return clone(cache.users);
}

export async function createDemoAccount(input) {
  const result = await request("/auth/register", {
    method: "POST",
    body: {
      nickname: String(input.nickname || "").trim(),
      faculty: String(input.faculty || "").trim(),
      department: String(input.department || "").trim(),
      year: Number(input.year),
    },
    authenticated: false,
  });
  setAuthenticatedSession(result.user, result.session);
  await refreshMarketplace();
  return mapUser(result.user);
}

export async function startDemoSession(userId) {
  const result = await request("/auth/session", {
    method: "POST",
    body: { userId: Number(userId) },
    authenticated: false,
  });
  setAuthenticatedSession(result.user, result.session);
  await refreshMarketplace();
  return getSession();
}

export function endDemoSession() {
  clearToken();
  cache.transactions = [];
  cache.notifications = [];
  cache.comments = [];
  return getSession();
}

export async function updateProfile(input) {
  const user = await request("/users/me", {
    method: "PATCH",
    body: {
      nickname: String(input.nickname || "").trim(),
      faculty: String(input.faculty || "").trim(),
      department: String(input.department || "").trim(),
      year: Number(input.year),
    },
  });
  setAuthenticatedSession(user);
  await refreshMarketplace();
  return getSession();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function listBooks(filters = {}) {
  const term = normalizeText(filters.search);
  return clone(
    cache.books
      .filter(
        (book) =>
          !term ||
          [book.title, book.course, book.faculty, book.department, book.description]
            .map(normalizeText)
            .some((value) => value.includes(term)),
      )
      .filter((book) => !filters.faculty || book.faculty === filters.faculty)
      .filter((book) => !filters.status || book.status === filters.status)
      .sort((left, right) => right.relatedScore - left.relatedScore || right.usedYear - left.usedYear),
  );
}

export function listTransactions() {
  return clone(cache.transactions);
}

export function listNotifications() {
  return clone(cache.notifications);
}

export function listComments(bookId) {
  return clone(cache.comments.filter((comment) => comment.bookId === String(bookId)));
}

export async function createComment(bookId, input) {
  const comment = await request(`/books/${Number(bookId)}/comments`, {
    method: "POST",
    body: { body: String(input?.body || "").trim() },
  });
  await refreshMarketplace();
  return mapComment(comment);
}

export async function createListing(input) {
  const session = getSession();
  const book = await request("/books", {
    method: "POST",
    body: {
      title: String(input.title || "").trim(),
      price: Number(input.price),
      description: String(input.description || "").trim() || undefined,
      usedLesson: String(input.course || "").trim(),
      usedYear: Number(input.usedYear),
      usedFaculty: String(input.faculty || session.faculty),
      usedDepartment: session.department,
      targetYear: session.year,
      materialType: input.materialType === "REFERENCE" ? "REFERENCE" : "REQUIRED",
      category: "デモ出品",
    },
  });
  await refreshMarketplace();
  return mapBook(book);
}

export async function requestPurchase(bookId) {
  const book = cache.books.find((candidate) => candidate.id === String(bookId));
  if (!book) throw new Error("対象の教科書が見つかりません");
  const transaction = await request("/transactions", {
    method: "POST",
    body: {
      bookId: Number(bookId),
      offeredPrice: book.price,
      message: "デモ用の購入相談です。実在する連絡先は含みません。",
    },
  });
  await refreshMarketplace();
  return mapTransaction(transaction);
}

export async function approveTransaction(transactionId) {
  const transaction = await request(`/transactions/${Number(transactionId)}`, {
    method: "PATCH",
    body: { action: "APPROVE" },
  });
  await refreshMarketplace();
  return mapTransaction(transaction);
}

export async function resetDemoData() {
  await request("/demo/reset", { method: "POST", body: {} });
  clearToken();
  cache.books = [];
  cache.transactions = [];
  cache.notifications = [];
  cache.comments = [];
  await refreshAccounts();
  if (cache.users[0]) await startDemoSession(cache.users[0].id);
}
