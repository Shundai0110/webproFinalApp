import {
  createListing,
  endDemoSession,
  getSession,
  listBooks,
  listDemoUsers,
  listTransactions,
  requestPurchase,
  resetDemoData,
  startDemoSession,
  updateProfile,
} from "./apiClient.js";
import { materialTypeLabels, statusLabels } from "./data.js";

const state = {
  filters: {
    search: "",
    faculty: "",
    status: "",
  },
  activeBookId: "",
};

const refs = {
  sessionAvatar: document.querySelector("#session-avatar"),
  sessionName: document.querySelector("#session-name"),
  sessionMeta: document.querySelector("#session-meta"),
  sessionPoints: document.querySelector("#session-points"),
  sessionState: document.querySelector("#session-state"),
  sessionExpiry: document.querySelector("#session-expiry"),
  demoUserSelect: document.querySelector("#demo-user-select"),
  startSession: document.querySelector("#start-session"),
  endSession: document.querySelector("#end-session"),
  profileForm: document.querySelector("#profile-form"),
  searchInput: document.querySelector("#search-input"),
  facultyFilter: document.querySelector("#faculty-filter"),
  statusFilter: document.querySelector("#status-filter"),
  resultCount: document.querySelector("#result-count"),
  bookList: document.querySelector("#book-list"),
  bookDetail: document.querySelector("#book-detail"),
  listingForm: document.querySelector("#listing-form"),
  listingFields: document.querySelector("#listing-fields"),
  listingAuthMessage: document.querySelector("#listing-auth-message"),
  transactionCount: document.querySelector("#transaction-count"),
  transactionList: document.querySelector("#transaction-list"),
  resetDemo: document.querySelector("#reset-demo"),
  toast: document.querySelector("#toast"),
};

let toastTimer = 0;
let renderedProfileSignature = "";

function formatPrice(price) {
  return price === 0 ? "譲渡" : `${price.toLocaleString("ja-JP")} pt`;
}

function formatSessionExpiry(expiresAt) {
  if (!expiresAt) return "外部認証には接続しません";
  return `有効期限 ${new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(expiresAt))}`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    refs.toast.classList.remove("is-visible");
  }, 2400);
}

function createStatusBadge(status) {
  const badge = document.createElement("span");
  badge.className = `status-badge status-${status}`;
  badge.textContent = statusLabels[status] || status;
  return badge;
}

function populateDemoUserOptions(session) {
  const users = listDemoUsers();
  const selectedId = session.userId || refs.demoUserSelect.value || users[0]?.id || "";

  refs.demoUserSelect.replaceChildren();
  users.forEach((user) => {
    refs.demoUserSelect.append(
      new Option(`${user.nickname} / ${user.faculty} ${user.year}年`, user.id),
    );
  });
  refs.demoUserSelect.value = users.some((user) => user.id === selectedId)
    ? selectedId
    : users[0]?.id || "";
}

function updateSession() {
  const session = getSession();
  populateDemoUserOptions(session);

  refs.sessionAvatar.textContent = session.avatar;
  refs.sessionName.textContent = session.name;
  refs.sessionMeta.textContent = session.authenticated
    ? `${session.faculty} ${session.department || "学科未設定"} ${session.year}年`
    : "デモアカウントを選択";
  refs.sessionPoints.textContent = `${session.pointBalance.toLocaleString("ja-JP")} pt`;
  refs.sessionState.textContent = session.authenticated ? "接続中" : "未接続";
  refs.sessionState.classList.toggle("is-active", session.authenticated);
  refs.sessionExpiry.textContent = formatSessionExpiry(session.expiresAt);
  refs.endSession.disabled = !session.authenticated;

  const fields = refs.profileForm.elements;
  const profileSignature = session.authenticated
    ? [session.userId, session.name, session.faculty, session.department, session.year].join(":")
    : "anonymous";
  if (profileSignature !== renderedProfileSignature) {
    fields.nickname.value = session.authenticated ? session.name : "";
    fields.faculty.value = session.authenticated ? session.faculty : "経済学部";
    fields.department.value = session.authenticated ? session.department : "";
    fields.year.value = session.authenticated ? String(session.year) : "1";
    renderedProfileSignature = profileSignature;
  }
  [...refs.profileForm.elements].forEach((control) => {
    control.disabled = !session.authenticated;
  });

  // UIを改変されても、実際の更新処理では apiClient がセッションを再検証する。
  refs.listingFields.disabled = !session.authenticated;
  refs.listingAuthMessage.textContent = !session.authenticated
    ? "デモアカウントが必要です"
    : `${session.name} として出品`;

  return session;
}

function syncListingFaculty(session) {
  const faculty = refs.listingForm.elements.faculty;
  if (session.authenticated && [...faculty.options].some((option) => option.value === session.faculty)) {
    faculty.value = session.faculty;
  }
}

function updateFacultyOptions(books) {
  const current = refs.facultyFilter.value;
  const faculties = [...new Set(books.map((book) => book.faculty))].sort();
  refs.facultyFilter.replaceChildren(new Option("すべて", ""));
  faculties.forEach((faculty) => {
    refs.facultyFilter.append(new Option(faculty, faculty));
  });
  refs.facultyFilter.value = faculties.includes(current) ? current : "";
}

function renderTransactions(session) {
  const transactions = listTransactions();
  refs.transactionCount.textContent = String(transactions.length);
  refs.transactionList.replaceChildren();

  if (!session.authenticated) {
    const item = document.createElement("li");
    item.textContent = "利用開始後に取引を表示します";
    refs.transactionList.append(item);
    return;
  }

  if (transactions.length === 0) {
    const item = document.createElement("li");
    item.textContent = "このユーザーの取引はありません";
    refs.transactionList.append(item);
    return;
  }

  transactions.slice(0, 4).forEach((transaction) => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const meta = document.createElement("div");
    const partner =
      transaction.buyerId === session.userId
        ? `出品者 ${transaction.sellerName}`
        : `購入者 ${transaction.buyerName}`;

    title.textContent = transaction.bookTitle;
    meta.textContent = `${partner} / ${statusLabels[transaction.status] || "承諾待ち"} / ${formatPrice(
      transaction.offeredPrice,
    )}`;

    item.append(title, meta);
    refs.transactionList.append(item);
  });
}

function selectBook(bookId) {
  state.activeBookId = bookId;
  render();
}

function renderBooks(books, session) {
  refs.bookList.replaceChildren();
  refs.resultCount.textContent = `${books.length}件`;

  if (books.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "条件に一致する教科書はありません";
    refs.bookList.append(empty);
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("article");
    const cover = document.createElement("img");
    const body = document.createElement("div");
    const header = document.createElement("div");
    const badges = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("p");
    const price = document.createElement("span");
    const action = document.createElement("button");

    card.className = "book-card";
    card.setAttribute("aria-current", String(book.id === state.activeBookId));
    badges.className = "book-badges";
    badges.append(createStatusBadge(book.status));
    if (session.authenticated && book.sellerId === session.userId) {
      const ownership = document.createElement("span");
      ownership.className = "own-listing-badge";
      ownership.textContent = "自分の出品";
      card.classList.add("is-own-listing");
      badges.append(ownership);
    }
    cover.className = "book-cover";
    cover.src = book.imageUrl;
    cover.alt = `${book.title}の表紙`;
    body.className = "book-card-body";
    header.className = "book-card-header";
    title.className = "book-title";
    title.textContent = book.title;

    meta.className = "book-meta";
    meta.append(
      `${book.course} / ${book.faculty}`,
      document.createElement("br"),
      `${book.usedYear}年度 / ${materialTypeLabels[book.materialType]}`,
    );

    price.className = "price";
    price.textContent = formatPrice(book.price);
    action.className = "small-button";
    action.type = "button";
    action.textContent = "詳細";
    action.addEventListener("click", () => selectBook(book.id));

    header.append(title, badges);
    body.append(header, meta, price, action);
    card.append(cover, body);
    refs.bookList.append(card);
  });
}

function renderDetail(book, session) {
  refs.bookDetail.replaceChildren();

  if (!book) {
    const empty = document.createElement("div");
    empty.className = "detail-empty";
    empty.textContent = "教科書を選択してください";
    refs.bookDetail.append(empty);
    return;
  }

  const cover = document.createElement("img");
  const body = document.createElement("div");
  const titleRow = document.createElement("div");
  const title = document.createElement("h3");
  const detailList = document.createElement("dl");
  const description = document.createElement("p");
  const purchaseButton = document.createElement("button");

  cover.className = "detail-cover";
  cover.src = book.imageUrl;
  cover.alt = `${book.title}の表紙`;
  body.className = "detail-body";
  titleRow.className = "detail-title-row";
  title.textContent = book.title;
  titleRow.append(title, createStatusBadge(book.status));

  detailList.className = "detail-list";
  [
    ["仮想価格", formatPrice(book.price)],
    ["授業", book.course],
    ["学部", book.faculty],
    ["年度", `${book.usedYear}年度`],
    ["種別", materialTypeLabels[book.materialType]],
    ["出品者", book.sellerName],
  ].forEach(([term, value]) => {
    const cell = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    cell.append(dt, dd);
    detailList.append(cell);
  });

  description.className = "description";
  description.textContent = book.description;

  const isOwnListing = session.authenticated && book.sellerId === session.userId;
  const canPurchase = session.authenticated && book.status === "AVAILABLE" && !isOwnListing;
  purchaseButton.className = "primary-button";
  purchaseButton.type = "button";
  purchaseButton.disabled = !canPurchase;
  if (!session.authenticated) {
    purchaseButton.textContent = "アカウント選択後に購入";
  } else if (isOwnListing) {
    purchaseButton.textContent = "自分の出品は購入不可";
  } else {
    purchaseButton.textContent = book.status === "AVAILABLE" ? "購入相談を開始" : "購入相談不可";
  }

  purchaseButton.addEventListener("click", () => {
    try {
      const transaction = requestPurchase(book.id);
      state.activeBookId = transaction.bookId;
      showToast("購入相談を作成しました");
      render();
    } catch (error) {
      showToast(error.message);
    }
  });

  body.append(titleRow, detailList, description, purchaseButton);
  refs.bookDetail.append(cover, body);
}

function render() {
  const session = updateSession();
  const allBooks = listBooks();
  updateFacultyOptions(allBooks);
  refs.facultyFilter.value = state.filters.faculty;

  const books = listBooks(state.filters);
  if (!state.activeBookId && books[0]) state.activeBookId = books[0].id;

  const activeBook = books.find((book) => book.id === state.activeBookId) || books[0] || null;
  if (activeBook) state.activeBookId = activeBook.id;

  renderBooks(books, session);
  renderDetail(activeBook, session);
  renderTransactions(session);
}

function bindEvents() {
  refs.startSession.addEventListener("click", () => {
    try {
      const session = startDemoSession(refs.demoUserSelect.value);
      syncListingFaculty(session);
      showToast(`${session.name} として利用を開始しました`);
      render();
    } catch (error) {
      showToast(error.message);
    }
  });

  refs.endSession.addEventListener("click", () => {
    endDemoSession();
    showToast("デモセッションを終了しました");
    render();
  });

  refs.profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const profile = updateProfile(Object.fromEntries(new FormData(refs.profileForm).entries()));
      syncListingFaculty(profile);
      showToast("プロフィールを保存しました");
      render();
    } catch (error) {
      showToast(error.message);
    }
  });

  refs.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    state.activeBookId = "";
    render();
  });

  refs.facultyFilter.addEventListener("change", (event) => {
    state.filters.faculty = event.target.value;
    state.activeBookId = "";
    render();
  });

  refs.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    state.activeBookId = "";
    render();
  });

  refs.listingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const book = createListing(Object.fromEntries(new FormData(refs.listingForm).entries()));
      refs.listingForm.reset();
      syncListingFaculty(getSession());
      state.activeBookId = book.id;
      state.filters.status = "";
      refs.statusFilter.value = "";
      showToast("出品を追加しました");
      render();
    } catch (error) {
      showToast(error.message);
    }
  });

  refs.resetDemo.addEventListener("click", () => {
    resetDemoData();
    state.activeBookId = "";
    state.filters = { search: "", faculty: "", status: "" };
    refs.searchInput.value = "";
    refs.statusFilter.value = "";
    refs.listingForm.reset();
    showToast("アカウントを含むデモデータを初期化しました");
    render();
  });
}

bindEvents();
render();
