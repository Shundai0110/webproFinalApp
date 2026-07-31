import assert from "node:assert/strict";
import test from "node:test";

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

function json(data, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function apiError(message, status = 401) {
  return new Response(
    JSON.stringify({ success: false, error: { code: "TEST_ERROR", message } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

test("frontend uses the shared API and keeps only the signed session in browser storage", async () => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new Proxy(
    {},
    {
      get() {
        throw new Error("domain data must not use localStorage");
      },
    },
  );
  globalThis.__KEIO_BOOK_API_BASE__ = "http://demo.test/api";

  const requests = [];
  const users = [
    {
      id: 1,
      demoUserKey: "demo-user-one",
      nickname: "Demo One",
      faculty: "経済学部",
      department: "経済学科",
      year: 1,
      pointBalance: 5000,
    },
    {
      id: 2,
      demoUserKey: "demo-user-two",
      nickname: "Demo Two",
      faculty: "法学部",
      department: "法律学科",
      year: 2,
      pointBalance: 3200,
    },
  ];
  const books = [
    {
      id: 10,
      title: "経済学入門",
      price: 1200,
      usedLesson: "経済学 I",
      usedFaculty: "経済学部",
      usedDepartment: "経済学科",
      targetYear: 1,
      usedYear: 2026,
      materialType: "REQUIRED",
      status: "AVAILABLE",
      sellerId: 2,
      seller: users[1],
    },
  ];
  const transactions = [
    {
      id: 20,
      bookId: 10,
      buyerId: 1,
      sellerId: 2,
      offeredPrice: 1200,
      buyerApproved: true,
      sellerApproved: false,
      status: "PENDING",
      book: books[0],
      buyer: users[0],
      seller: users[1],
    },
  ];
  let activeUser = users[0];
  let token = "signed-demo-token-1";

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method || "GET";
    const path = url.pathname.replace(/^\/api/, "");
    const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ path, method, headers: init.headers || {}, body });

    if (method === "POST" && path === "/demo/open") {
      return json({ clientId: "browser-client-1", storageMode: "ephemeral" }, 201);
    }
    if (method === "GET" && path === "/auth/accounts") return json(users);
    if (method === "POST" && path === "/auth/session") {
      activeUser = users.find((user) => user.id === body.userId);
      token = `signed-demo-token-${activeUser.id}`;
      return json({
        user: activeUser,
        session: { token, expiresAt: "2099-01-01T00:00:00.000Z" },
      });
    }
    if (method === "POST" && path === "/auth/register") {
      activeUser = { id: 3, demoUserKey: "demo-user-three", pointBalance: 5000, ...body };
      users.push(activeUser);
      token = "signed-demo-token-3";
      return json(
        {
          user: activeUser,
          session: { token, expiresAt: "2099-01-01T00:00:00.000Z" },
        },
        201,
      );
    }

    const authorization = init.headers?.Authorization;
    if (authorization !== `Bearer ${token}`) return apiError("デモ認証が必要です");
    if (method === "GET" && path === "/users/me") return json(activeUser);
    if (method === "GET" && path === "/books") return json(books);
    if (method === "GET" && path === "/transactions") return json(transactions);
    if (method === "GET" && path === "/notifications") return json([]);
    if (method === "GET" && path === "/comments") return json([]);
    if (method === "POST" && path === "/books") {
      const created = {
        id: 11,
        ...body,
        status: "AVAILABLE",
        sellerId: activeUser.id,
        seller: activeUser,
      };
      books.push(created);
      return json(created, 201);
    }
    if (method === "DELETE" && path.startsWith("/books/")) {
      const id = Number(path.split("/").at(-1));
      const index = books.findIndex((book) => book.id === id);
      const cancelled = { ...books[index], status: "CANCELLED" };
      books.splice(index, 1);
      return json(cancelled);
    }
    if (method === "PATCH" && path === "/transactions/20") {
      transactions[0] =
        body.action === "CANCEL_PURCHASE"
          ? {
              ...transactions[0],
              status: "CANCELLED",
              book: { ...transactions[0].book, status: "AVAILABLE" },
            }
          : {
              ...transactions[0],
              buyerApproved: body.action === "APPROVE",
            };
      return json(transactions[0]);
    }
    return apiError(`unexpected mock route: ${method} ${path}`, 404);
  };

  const api = await import(`../src/apiClient.js?api-test=${Date.now()}`);
  await api.initializeApi();
  assert.equal(api.getSession().authenticated, true);
  assert.equal(api.getSession().userId, "1");
  assert.equal(api.listBooks().length, 1);
  assert.deepEqual(api.getPurchaseBudget(4000), {
    balance: 5000,
    pendingAmount: 1200,
    requestedAmount: 4000,
    remainingAmount: -200,
    exceedsBalance: true,
  });
  assert.ok(
    requests.some(
      (request) =>
        request.path === "/books" &&
        request.method === "GET" &&
        request.headers.Authorization === "Bearer signed-demo-token-1",
    ),
  );

  const listing = await api.createListing({
    title: "API経由の出品",
    course: "デモ演習",
    usedYear: 2026,
    price: 500,
  });
  assert.equal(listing.id, "11");
  const createBookRequest = requests.find(
    (request) => request.path === "/books" && request.method === "POST",
  );
  assert.equal(createBookRequest.headers.Authorization, "Bearer signed-demo-token-1");
  assert.equal(createBookRequest.body.title, "API経由の出品");

  const cancelled = await api.cancelListing(listing.id);
  assert.equal(cancelled.status, "CANCELLED");
  assert.ok(
    requests.some(
      (request) => request.path === "/books/11" && request.method === "DELETE",
    ),
  );

  const revoked = await api.revokeTransactionApproval(20);
  assert.equal(revoked.buyerApproved, false);
  const revokeRequest = requests.find(
    (request) => request.path === "/transactions/20" && request.method === "PATCH",
  );
  assert.equal(revokeRequest.body.action, "REVOKE_APPROVAL");

  const purchaseCancelled = await api.cancelPurchaseRequest(20);
  assert.equal(purchaseCancelled.status, "CANCELLED");
  const purchaseCancelRequest = requests.find(
    (request) =>
      request.path === "/transactions/20" &&
      request.method === "PATCH" &&
      request.body.action === "CANCEL_PURCHASE",
  );
  assert.ok(purchaseCancelRequest);
  assert.deepEqual(api.getPurchaseBudget(4000), {
    balance: 5000,
    pendingAmount: 0,
    requestedAmount: 4000,
    remainingAmount: 1000,
    exceedsBalance: false,
  });

  const account = await api.createDemoAccount({
    nickname: "Demo Three",
    faculty: "文学部",
    department: "人文社会学科",
    year: 3,
  });
  assert.equal(account.pointBalance, 5000);
  const registerRequest = requests.find((request) => request.path === "/auth/register");
  assert.deepEqual(Object.keys(registerRequest.body).sort(), [
    "department",
    "faculty",
    "nickname",
    "year",
  ]);

  api.endDemoSession();
  await assert.rejects(
    () =>
      api.createListing({ title: "未認証", course: "演習", usedYear: 2026, price: 100 }),
    /デモ認証が必要/,
  );
});
