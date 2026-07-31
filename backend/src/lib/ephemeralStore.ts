import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { MAX_DEMO_ACCOUNTS, NEW_DEMO_ACCOUNT_POINTS } from "../domain/constants.js";
import {
  assertBuyerCanCancelPurchase,
  nextApprovalState,
  revokedApprovalState,
} from "../domain/transactionPolicy.js";
import { AppError } from "../errors/AppError.js";

type SqlValue = null | number | bigint | string | NodeJS.ArrayBufferView;
type Row = Record<string, null | number | bigint | string | NodeJS.NonSharedUint8Array>;

export type EphemeralUser = {
  id: number;
  demoUserKey: string;
  nickname: string;
  year: number;
  faculty: string;
  department: string;
  iconUrl: string | null;
  pointBalance: number;
  createdAt: string;
  updatedAt: string;
};

export type EphemeralBook = {
  id: number;
  title: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  sellerId: number;
  status: "AVAILABLE" | "NEGOTIATING" | "SOLD" | "CANCELLED";
  usedYear: number;
  usedLesson: string;
  usedFaculty: string | null;
  usedDepartment: string | null;
  targetYear: number | null;
  materialType: "REQUIRED" | "REFERENCE";
  category: string | null;
  createdAt: string;
  updatedAt: string;
  seller: Pick<EphemeralUser, "id" | "nickname" | "faculty" | "department" | "year" | "iconUrl">;
};

export type EphemeralTransaction = {
  id: number;
  bookId: number;
  buyerId: number;
  sellerId: number;
  offeredPrice: number;
  buyerApproved: boolean;
  sellerApproved: boolean;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  message: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  book: EphemeralBook;
  buyer: EphemeralUser;
  seller: EphemeralUser;
};

export type DemoProfileInput = {
  nickname?: string;
  faculty?: string;
  department?: string;
  year?: number;
  iconUrl?: string | null;
};

export type EphemeralBookInput = {
  title?: string;
  price?: number;
  description?: string | null;
  imageUrl?: string | null;
  usedLesson?: string;
  usedYear?: number;
  usedFaculty?: string | null;
  usedDepartment?: string | null;
  targetYear?: number | null;
  materialType?: "REQUIRED" | "REFERENCE";
  category?: string | null;
  status?: "AVAILABLE" | "NEGOTIATING" | "SOLD" | "CANCELLED";
};

export type EphemeralBookQuery = {
  q?: string;
  faculty?: string;
  department?: string;
  year?: number;
  usedYear?: number;
  materialType?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

const userColumns = `
  id,
  demo_user_key AS demoUserKey,
  nickname,
  year,
  faculty,
  department,
  icon_url AS iconUrl,
  point_balance AS pointBalance,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const bookWhereSql = `
  (($status IS NULL AND b.status <> 'CANCELLED') OR b.status = $status)
  AND ($faculty IS NULL OR b.used_faculty = $faculty)
  AND ($department IS NULL OR b.used_department = $department)
  AND ($targetYear IS NULL OR b.target_year = $targetYear)
  AND ($usedYear IS NULL OR b.used_year = $usedYear)
  AND ($materialType IS NULL OR b.material_type = $materialType)
  AND ($category IS NULL OR b.category = $category)
  AND (
    $q IS NULL OR instr(lower(b.title), lower($q)) > 0
    OR instr(lower(b.used_lesson), lower($q)) > 0
  )
`;

function bookFilterParams(filters: EphemeralBookQuery) {
  return {
    status: filters.status ?? null,
    faculty: filters.faculty ?? null,
    department: filters.department ?? null,
    targetYear: filters.year ?? null,
    usedYear: filters.usedYear ?? null,
    materialType: filters.materialType ?? null,
    category: filters.category ?? null,
    q: filters.q ?? null,
  } satisfies Record<string, SqlValue>;
}

function isoNow() {
  return new Date().toISOString();
}

function bool(value: Row[string]) {
  return value === 1;
}

function numberId(value: number | bigint) {
  return Number(value);
}

function asRows(rows: Row[]) {
  return rows.map((row) => ({ ...row }));
}

export class EphemeralStore {
  #db!: DatabaseSync;
  #generation = 0;

  constructor() {
    this.reset();
  }

  get generation() {
    return this.#generation;
  }

  reset() {
    if (this.#db?.isOpen) this.#db.close();
    this.#db = new DatabaseSync(":memory:", {
      enableForeignKeyConstraints: true,
      timeout: 1_000,
    });
    this.#createSchema();
    this.#seed();
    this.#generation += 1;
  }

  close() {
    if (this.#db.isOpen) this.#db.close();
  }

  stats() {
    const count = (table: string) => {
      const row = this.#db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as Row;
      return Number(row.count);
    };
    return {
      mode: "ephemeral" as const,
      generation: this.#generation,
      users: count("users"),
      books: count("books"),
      transactions: count("transactions"),
      comments: count("comments"),
      notifications: count("notifications"),
    };
  }

  probe() {
    const row = this.#db.prepare("SELECT 1 AS ok").get() as Row;
    return Number(row.ok) === 1;
  }

  listUsers() {
    const rows = this.#db.prepare(`SELECT ${userColumns} FROM users ORDER BY id ASC`).all() as Row[];
    return rows.map((row) => this.#mapUser(row));
  }

  getUser(id: number) {
    const row = this.#db.prepare(`SELECT ${userColumns} FROM users WHERE id = ?`).get(id) as
      | Row
      | undefined;
    return row ? this.#mapUser(row) : null;
  }

  createUser(profile: Required<Omit<DemoProfileInput, "iconUrl">> & { iconUrl?: string | null }) {
    return this.#transaction(() => {
      const count = Number(
        (this.#db.prepare("SELECT COUNT(*) AS count FROM users").get() as Row).count,
      );
      if (count >= MAX_DEMO_ACCOUNTS) {
        throw new AppError(409, "ACCOUNT_LIMIT_REACHED", "デモアカウントは合計20件までです");
      }

      const now = isoNow();
      const result = this.#db
        .prepare(`
          INSERT INTO users (
            demo_user_key, nickname, year, faculty, department, icon_url,
            point_balance, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          `demo-user-${randomUUID()}`,
          profile.nickname,
          profile.year,
          profile.faculty,
          profile.department,
          profile.iconUrl ?? null,
          NEW_DEMO_ACCOUNT_POINTS,
          now,
          now,
        );
      return this.getUser(numberId(result.lastInsertRowid))!;
    });
  }

  updateUser(id: number, profile: DemoProfileInput) {
    if (!this.getUser(id)) {
      throw new AppError(401, "UNAUTHENTICATED", "デモアカウントが見つかりません");
    }

    const assignments: string[] = [];
    const values: SqlValue[] = [];
    const columns: Array<[keyof DemoProfileInput, string]> = [
      ["nickname", "nickname"],
      ["faculty", "faculty"],
      ["department", "department"],
      ["year", "year"],
      ["iconUrl", "icon_url"],
    ];
    for (const [key, column] of columns) {
      if (profile[key] !== undefined) {
        assignments.push(`${column} = ?`);
        values.push(profile[key] ?? null);
      }
    }
    assignments.push("updated_at = ?");
    values.push(isoNow(), id);
    this.#db.prepare(`UPDATE users SET ${assignments.join(", ")} WHERE id = ?`).run(...values);
    return this.getUser(id)!;
  }

  listBooks(filters: EphemeralBookQuery = {}) {
    const params = bookFilterParams(filters);
    const rows = this.#db
      .prepare(`
        SELECT ${this.#bookColumns()}
        FROM books b
        JOIN users u ON u.id = b.seller_id
        WHERE ${bookWhereSql}
        ORDER BY b.used_year DESC, b.created_at DESC
        LIMIT $limit OFFSET $offset
      `)
      .all({
        ...params,
        limit: filters.limit ?? 100,
        offset: filters.offset ?? 0,
      }) as Row[];
    return rows.map((row) => this.#mapBook(row));
  }

  countBooks(filters: EphemeralBookQuery = {}) {
    const row = this.#db
      .prepare(`SELECT COUNT(*) AS count FROM books b WHERE ${bookWhereSql}`)
      .get(bookFilterParams(filters)) as Row;
    return Number(row.count);
  }

  getBook(id: number) {
    const row = this.#db
      .prepare(`
        SELECT ${this.#bookColumns()}
        FROM books b
        JOIN users u ON u.id = b.seller_id
        WHERE b.id = ?
      `)
      .get(id) as Row | undefined;
    return row ? this.#mapBook(row) : null;
  }

  createBook(sellerId: number, data: EphemeralBookInput) {
    if (!this.getUser(sellerId)) {
      throw new AppError(401, "UNAUTHENTICATED", "デモアカウントが見つかりません");
    }
    const now = isoNow();
    const result = this.#db
      .prepare(`
        INSERT INTO books (
          title, price, description, image_url, seller_id, status, used_year,
          used_lesson, used_faculty, used_department, target_year, material_type,
          category, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        data.title!,
        data.price!,
        data.description ?? null,
        data.imageUrl ?? "/assets/book-generic.svg",
        sellerId,
        data.usedYear!,
        data.usedLesson!,
        data.usedFaculty ?? null,
        data.usedDepartment ?? null,
        data.targetYear ?? null,
        data.materialType ?? "REQUIRED",
        data.category ?? null,
        now,
        now,
      );
    return this.getBook(numberId(result.lastInsertRowid))!;
  }

  updateBook(id: number, data: EphemeralBookInput) {
    const assignments: string[] = [];
    const values: SqlValue[] = [];
    const columns: Array<[keyof EphemeralBookInput, string]> = [
      ["title", "title"],
      ["price", "price"],
      ["description", "description"],
      ["imageUrl", "image_url"],
      ["status", "status"],
      ["usedYear", "used_year"],
      ["usedLesson", "used_lesson"],
      ["usedFaculty", "used_faculty"],
      ["usedDepartment", "used_department"],
      ["targetYear", "target_year"],
      ["materialType", "material_type"],
      ["category", "category"],
    ];
    for (const [key, column] of columns) {
      if (data[key] !== undefined) {
        assignments.push(`${column} = ?`);
        values.push(data[key] ?? null);
      }
    }
    assignments.push("updated_at = ?");
    values.push(isoNow(), id);
    this.#db.prepare(`UPDATE books SET ${assignments.join(", ")} WHERE id = ?`).run(...values);
    return this.getBook(id)!;
  }

  listTransactions(userId: number, limit = 100, offset = 0) {
    const ids = this.#db
      .prepare(`
        SELECT id FROM transactions
        WHERE buyer_id = ? OR seller_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(userId, userId, limit, offset) as Row[];
    return ids.map((row) => this.getTransaction(Number(row.id))!);
  }

  countTransactions(userId: number) {
    const row = this.#db
      .prepare("SELECT COUNT(*) AS count FROM transactions WHERE buyer_id = ? OR seller_id = ?")
      .get(userId, userId) as Row;
    return Number(row.count);
  }

  getTransaction(id: number): EphemeralTransaction | null {
    const row = this.#db
      .prepare(`
        SELECT
          id, book_id AS bookId, buyer_id AS buyerId, seller_id AS sellerId,
          offered_price AS offeredPrice, buyer_approved AS buyerApproved,
          seller_approved AS sellerApproved, status, message,
          created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt
        FROM transactions
        WHERE id = ?
      `)
      .get(id) as Row | undefined;
    if (!row) return null;
    return {
      id: Number(row.id),
      bookId: Number(row.bookId),
      buyerId: Number(row.buyerId),
      sellerId: Number(row.sellerId),
      offeredPrice: Number(row.offeredPrice),
      buyerApproved: bool(row.buyerApproved),
      sellerApproved: bool(row.sellerApproved),
      status: String(row.status) as EphemeralTransaction["status"],
      message: row.message === null ? null : String(row.message),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
      completedAt: row.completedAt === null ? null : String(row.completedAt),
      book: this.getBook(Number(row.bookId))!,
      buyer: this.getUser(Number(row.buyerId))!,
      seller: this.getUser(Number(row.sellerId))!,
    };
  }

  requestTransaction(currentUserId: number, bookId: number, offeredPrice: number, message?: string) {
    return this.#transaction(() => {
      const book = this.getBook(bookId);
      if (!book) throw new AppError(404, "BOOK_NOT_FOUND", "教科書が見つかりません");
      if (book.status !== "AVAILABLE") {
        throw new AppError(409, "BOOK_NOT_AVAILABLE", "この教科書は購入相談を開始できません");
      }
      if (Number(book.sellerId) === currentUserId) {
        throw new AppError(400, "SELF_PURCHASE", "自分の出品は購入できません");
      }
      if (Number(book.price) !== offeredPrice) {
        throw new AppError(409, "PRICE_CHANGED", "表示価格が更新されています。再読み込みしてください");
      }
      const buyer = this.getUser(currentUserId);
      if (!buyer) throw new AppError(401, "UNAUTHENTICATED", "購入者が見つかりません");
      const pendingRow = this.#db
        .prepare(`
          SELECT COALESCE(SUM(offered_price), 0) AS pendingAmount
          FROM transactions
          WHERE buyer_id = ? AND status = 'PENDING'
        `)
        .get(currentUserId) as Row;
      const pendingAmount = Number(pendingRow.pendingAmount);
      // SQLite transaction内で合計を確認し、申請作成との間に状態がずれないようにする。
      if (pendingAmount + offeredPrice > Number(buyer.pointBalance)) {
        throw new AppError(
          409,
          "PURCHASE_BUDGET_EXCEEDED",
          "申請中の購入額と今回の取引額の合計が現在の残高を超えます",
        );
      }

      const now = isoNow();
      const reserved = this.#db
        .prepare("UPDATE books SET status = 'NEGOTIATING', updated_at = ? WHERE id = ? AND status = 'AVAILABLE'")
        .run(now, bookId);
      if (reserved.changes !== 1) {
        throw new AppError(409, "BOOK_NOT_AVAILABLE", "別の購入相談が開始されています");
      }
      const result = this.#db
        .prepare(`
          INSERT INTO transactions (
            book_id, buyer_id, seller_id, offered_price, buyer_approved,
            seller_approved, status, message, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 0, 0, 'PENDING', ?, ?, ?)
        `)
        .run(bookId, currentUserId, Number(book.sellerId), offeredPrice, message ?? null, now, now);
      return this.getTransaction(numberId(result.lastInsertRowid))!;
    });
  }

  approveTransaction(currentUserId: number, id: number) {
    return this.#transaction(() => {
      const transaction = this.getTransaction(id);
      if (!transaction) {
        throw new AppError(404, "TRANSACTION_NOT_FOUND", "取引が見つかりません");
      }
      if (transaction.status !== "PENDING") {
        throw new AppError(409, "TRANSACTION_CLOSED", "この取引はすでに終了しています");
      }

      const approval = nextApprovalState(
        {
          buyerId: Number(transaction.buyerId),
          sellerId: Number(transaction.sellerId),
          buyerApproved: transaction.buyerApproved,
          sellerApproved: transaction.sellerApproved,
        },
        currentUserId,
      );
      const now = isoNow();
      if (!approval.shouldComplete) {
        this.#db
          .prepare(`
            UPDATE transactions
            SET buyer_approved = ?, seller_approved = ?, updated_at = ?
            WHERE id = ? AND status = 'PENDING'
          `)
          .run(Number(approval.buyerApproved), Number(approval.sellerApproved), now, id);
        return this.getTransaction(id)!;
      }

      if (transaction.book?.status !== "NEGOTIATING") {
        throw new AppError(409, "BOOK_STATE_CONFLICT", "教科書が取引中ではありません");
      }
      const debited = this.#db
        .prepare(`
          UPDATE users SET point_balance = point_balance - ?, updated_at = ?
          WHERE id = ? AND point_balance >= ?
        `)
        .run(
          Number(transaction.offeredPrice),
          now,
          Number(transaction.buyerId),
          Number(transaction.offeredPrice),
        );
      if (debited.changes !== 1) {
        throw new AppError(409, "INSUFFICIENT_POINTS", "仮想ポイント残高が不足しています");
      }
      this.#db
        .prepare("UPDATE users SET point_balance = point_balance + ?, updated_at = ? WHERE id = ?")
        .run(Number(transaction.offeredPrice), now, Number(transaction.sellerId));
      const sold = this.#db
        .prepare("UPDATE books SET status = 'SOLD', updated_at = ? WHERE id = ? AND status = 'NEGOTIATING'")
        .run(now, Number(transaction.bookId));
      if (sold.changes !== 1) {
        throw new AppError(409, "BOOK_STATE_CONFLICT", "教科書の状態が変更されています");
      }
      this.#db
        .prepare(`
          UPDATE transactions
          SET buyer_approved = 1, seller_approved = 1, status = 'COMPLETED',
              completed_at = ?, updated_at = ?
          WHERE id = ? AND status = 'PENDING'
        `)
        .run(now, now, id);

      const notify = this.#db.prepare(`
        INSERT INTO notifications (
          user_id, transaction_id, book_id, type, message, read, created_at
        ) VALUES (?, ?, ?, 'TRANSACTION_COMPLETED', ?, 0, ?)
      `);
      const title = String(transaction.book.title);
      const amount = Number(transaction.offeredPrice);
      notify.run(
        Number(transaction.buyerId),
        id,
        Number(transaction.bookId),
        `${title} の取引が完了し、${amount}円（デモ）を支払いました`,
        now,
      );
      notify.run(
        Number(transaction.sellerId),
        id,
        Number(transaction.bookId),
        `${title} の取引が完了し、${amount}円（デモ）を受け取りました`,
        now,
      );
      return this.getTransaction(id)!;
    });
  }

  revokeTransactionApproval(currentUserId: number, id: number) {
    return this.#transaction(() => {
      const transaction = this.getTransaction(id);
      if (!transaction) {
        throw new AppError(404, "TRANSACTION_NOT_FOUND", "取引が見つかりません");
      }
      if (transaction.status !== "PENDING") {
        throw new AppError(409, "TRANSACTION_CLOSED", "成立済みの取引は承認を取り消せません");
      }
      const approval = revokedApprovalState(transaction, currentUserId);
      this.#db
        .prepare(`
          UPDATE transactions
          SET buyer_approved = ?, seller_approved = ?, updated_at = ?
          WHERE id = ? AND status = 'PENDING'
        `)
        .run(
          Number(approval.buyerApproved),
          Number(approval.sellerApproved),
          isoNow(),
          id,
        );
      return this.getTransaction(id)!;
    });
  }

  cancelPurchaseRequest(currentUserId: number, id: number) {
    return this.#transaction(() => {
      const transaction = this.getTransaction(id);
      if (!transaction) {
        throw new AppError(404, "TRANSACTION_NOT_FOUND", "取引が見つかりません");
      }
      if (transaction.status !== "PENDING") {
        throw new AppError(409, "TRANSACTION_CLOSED", "この取引はすでに終了しています");
      }
      assertBuyerCanCancelPurchase(transaction, currentUserId);
      if (transaction.book?.status !== "NEGOTIATING") {
        throw new AppError(409, "BOOK_STATE_CONFLICT", "教科書が取引中ではありません");
      }

      const now = isoNow();
      // TransactionとBookを一括で戻し、取消後の申請額を残高計算から解放する。
      const cancelled = this.#db
        .prepare(`
          UPDATE transactions SET status = 'CANCELLED', updated_at = ?
          WHERE id = ? AND buyer_id = ? AND status = 'PENDING'
        `)
        .run(now, id, currentUserId);
      if (cancelled.changes !== 1) {
        throw new AppError(409, "TRANSACTION_CLOSED", "この取引はすでに終了しています");
      }
      const released = this.#db
        .prepare(`
          UPDATE books SET status = 'AVAILABLE', updated_at = ?
          WHERE id = ? AND status = 'NEGOTIATING'
        `)
        .run(now, Number(transaction.bookId));
      if (released.changes !== 1) {
        throw new AppError(409, "BOOK_STATE_CONFLICT", "教科書の状態が変更されています");
      }
      return this.getTransaction(id)!;
    });
  }

  listNotifications(userId: number, limit = 100, offset = 0) {
    const rows = this.#db
      .prepare(`
        SELECT
          id, user_id AS userId, transaction_id AS transactionId,
          book_id AS bookId, comment_id AS commentId, type, message,
          read, created_at AS createdAt
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(userId, limit, offset) as Row[];
    return rows.map((row) => ({ ...row, read: bool(row.read) }));
  }

  countNotifications(userId: number) {
    const row = this.#db
      .prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?")
      .get(userId) as Row;
    return Number(row.count);
  }

  listComments(bookId?: number, limit = 100, offset = 0) {
    const rows = this.#db
      .prepare(`
        SELECT
          c.id, c.book_id AS bookId, c.author_id AS authorId,
          c.body, c.created_at AS createdAt,
          u.nickname AS authorName
        FROM comments c
        JOIN users u ON u.id = c.author_id
        WHERE (? IS NULL OR c.book_id = ?)
        ORDER BY c.created_at ASC
        LIMIT ? OFFSET ?
      `)
      .all(bookId ?? null, bookId ?? null, limit, offset) as Row[];
    return asRows(rows);
  }

  countComments(bookId?: number) {
    const row = this.#db
      .prepare("SELECT COUNT(*) AS count FROM comments WHERE (? IS NULL OR book_id = ?)")
      .get(bookId ?? null, bookId ?? null) as Row;
    return Number(row.count);
  }

  createComment(bookId: number, authorId: number, body: string) {
    return this.#transaction(() => {
      const book = this.getBook(bookId);
      const author = this.getUser(authorId);
      if (!book) throw new AppError(404, "BOOK_NOT_FOUND", "教科書が見つかりません");
      if (!author) throw new AppError(401, "UNAUTHENTICATED", "投稿者が見つかりません");

      const now = isoNow();
      const result = this.#db
        .prepare("INSERT INTO comments (book_id, author_id, body, created_at) VALUES (?, ?, ?, ?)")
        .run(bookId, authorId, body, now);
      const commentId = numberId(result.lastInsertRowid);
      const recipients = new Set<number>();
      if (authorId !== Number(book.sellerId)) {
        recipients.add(Number(book.sellerId));
      } else {
        const commenters = this.#db
          .prepare("SELECT DISTINCT author_id AS authorId FROM comments WHERE book_id = ?")
          .all(bookId) as Row[];
        const buyers = this.#db
          .prepare("SELECT DISTINCT buyer_id AS buyerId FROM transactions WHERE book_id = ?")
          .all(bookId) as Row[];
        commenters.forEach((row) => recipients.add(Number(row.authorId)));
        buyers.forEach((row) => recipients.add(Number(row.buyerId)));
      }
      recipients.delete(authorId);

      const notify = this.#db.prepare(`
        INSERT INTO notifications (
          user_id, book_id, comment_id, type, message, read, created_at
        ) VALUES (?, ?, ?, 'COMMENT', ?, 0, ?)
      `);
      recipients.forEach((userId) => {
        notify.run(
          userId,
          bookId,
          commentId,
          `${String(author.nickname)} さんが「${String(book.title)}」にコメントしました`,
          now,
        );
      });
      return this.listComments(bookId).find((comment) => Number(comment.id) === commentId)!;
    });
  }

  #transaction<T>(operation: () => T): T {
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.#db.exec("COMMIT");
      return result;
    } catch (error) {
      this.#db.exec("ROLLBACK");
      throw error;
    }
  }

  #bookColumns() {
    return `
      b.id,
      b.title,
      b.price,
      b.description,
      b.image_url AS imageUrl,
      b.seller_id AS sellerId,
      b.status,
      b.used_year AS usedYear,
      b.used_lesson AS usedLesson,
      b.used_faculty AS usedFaculty,
      b.used_department AS usedDepartment,
      b.target_year AS targetYear,
      b.material_type AS materialType,
      b.category,
      b.created_at AS createdAt,
      b.updated_at AS updatedAt,
      u.id AS sellerUserId,
      u.nickname AS sellerNickname,
      u.faculty AS sellerFaculty,
      u.department AS sellerDepartment,
      u.year AS sellerYear,
      u.icon_url AS sellerIconUrl
    `;
  }

  #mapUser(row: Row): EphemeralUser {
    return {
      id: Number(row.id),
      demoUserKey: String(row.demoUserKey),
      nickname: String(row.nickname),
      year: Number(row.year),
      faculty: String(row.faculty),
      department: String(row.department),
      iconUrl: row.iconUrl === null ? null : String(row.iconUrl),
      pointBalance: Number(row.pointBalance),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }

  #mapBook(row: Row): EphemeralBook {
    return {
      id: Number(row.id),
      title: String(row.title),
      price: Number(row.price),
      description: row.description === null ? null : String(row.description),
      imageUrl: row.imageUrl === null ? null : String(row.imageUrl),
      sellerId: Number(row.sellerId),
      status: String(row.status) as EphemeralBook["status"],
      usedYear: Number(row.usedYear),
      usedLesson: String(row.usedLesson),
      usedFaculty: row.usedFaculty === null ? null : String(row.usedFaculty),
      usedDepartment: row.usedDepartment === null ? null : String(row.usedDepartment),
      targetYear: row.targetYear === null ? null : Number(row.targetYear),
      materialType: String(row.materialType) as EphemeralBook["materialType"],
      category: row.category === null ? null : String(row.category),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
      seller: {
        id: Number(row.sellerUserId),
        nickname: String(row.sellerNickname),
        faculty: String(row.sellerFaculty),
        department: String(row.sellerDepartment),
        year: Number(row.sellerYear),
        iconUrl: row.sellerIconUrl === null ? null : String(row.sellerIconUrl),
      },
    };
  }

  #createSchema() {
    this.#db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        demo_user_key TEXT NOT NULL UNIQUE,
        nickname TEXT NOT NULL CHECK(length(nickname) BETWEEN 1 AND 40),
        year INTEGER NOT NULL CHECK(year BETWEEN 1 AND 6),
        faculty TEXT NOT NULL,
        department TEXT NOT NULL DEFAULT '',
        icon_url TEXT,
        point_balance INTEGER NOT NULL DEFAULT 5000 CHECK(point_balance >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        price INTEGER NOT NULL CHECK(price >= 0),
        description TEXT,
        image_url TEXT,
        seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status TEXT NOT NULL DEFAULT 'AVAILABLE'
          CHECK(status IN ('AVAILABLE', 'NEGOTIATING', 'SOLD', 'CANCELLED')),
        used_year INTEGER NOT NULL,
        used_lesson TEXT NOT NULL,
        used_faculty TEXT,
        used_department TEXT,
        target_year INTEGER,
        material_type TEXT NOT NULL DEFAULT 'REQUIRED'
          CHECK(material_type IN ('REQUIRED', 'REFERENCE')),
        category TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
        buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        offered_price INTEGER NOT NULL CHECK(offered_price >= 0),
        seller_approved INTEGER NOT NULL DEFAULT 0 CHECK(seller_approved IN (0, 1)),
        buyer_approved INTEGER NOT NULL DEFAULT 0 CHECK(buyer_approved IN (0, 1)),
        status TEXT NOT NULL DEFAULT 'PENDING'
          CHECK(status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
        message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      ) STRICT;

      CREATE TABLE comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 240),
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('TRANSACTION_COMPLETED', 'COMMENT')),
        message TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0 CHECK(read IN (0, 1)),
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX books_status_idx ON books(status);
      CREATE INDEX books_seller_id_idx ON books(seller_id);
      CREATE INDEX transactions_participants_idx ON transactions(buyer_id, seller_id);
      CREATE INDEX comments_book_id_idx ON comments(book_id, created_at);
      CREATE INDEX notifications_user_id_idx ON notifications(user_id, created_at);
    `);
  }

  #seed() {
    const now = isoNow();
    const insertUser = this.#db.prepare(`
      INSERT INTO users (
        demo_user_key, nickname, year, faculty, department, point_balance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ["demo-user-suzuki", "A. Suzuki", 1, "経済学部", "経済学科", 5000],
      ["demo-user-tanaka", "S. Tanaka", 2, "経済学部", "経済学科", 3200],
      ["demo-user-sato", "M. Sato", 2, "法学部", "法律学科", 4100],
      ["demo-user-kato", "R. Kato", 1, "理工学部", "学門 A", 2800],
      ["demo-user-ito", "A. Ito", 2, "商学部", "商学科", 3600],
    ].forEach((user) => insertUser.run(...(user as SqlValue[]), now, now));

    const insertBook = this.#db.prepare(`
      INSERT INTO books (
        title, price, description, image_url, seller_id, status, used_year,
        used_lesson, used_faculty, used_department, target_year, material_type,
        category, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ["経済学入門", 1200, "日吉キャンパスの経済学 I で使用。表紙に軽い擦れがあります。", "/assets/book-economics.svg", 2, "AVAILABLE", 2025, "経済学 I", "経済学部", "経済学科", 1, "REQUIRED", "専門科目"],
      ["民法総則ケースブック", 1800, "授業で扱った章に付箋跡があります。本文の破れはありません。", "/assets/book-law.svg", 3, "AVAILABLE", 2024, "民法総則", "法学部", "法律学科", 2, "REQUIRED", "専門科目"],
      ["線形代数スタンダード", 900, "演習問題の解説が多い参考書。購入相談中のサンプルです。", "/assets/book-math.svg", 4, "NEGOTIATING", 2025, "線形代数", "理工学部", "学門 A", 1, "REFERENCE", "専門科目"],
      ["マーケティング基礎", 700, "過去年度版。取引成立済みのサンプルとして表示しています。", "/assets/book-business.svg", 5, "SOLD", 2023, "マーケティング論", "商学部", "商学科", 2, "REQUIRED", "専門科目"],
      ["ミクロ経済学ワークブック", 1300, "演習問題中心の架空教材です。ページの折れや書き込みはない設定です。", "/assets/book-generic.svg", 1, "AVAILABLE", 2026, "ミクロ経済学", "経済学部", "経済学科", 1, "REFERENCE", "専門科目"],
      ["憲法判例ガイド", 1600, "主要判例をまとめた架空教材です。カバーに軽い擦れがある設定です。", "/assets/book-generic.svg", 3, "AVAILABLE", 2025, "憲法 I", "法学部", "法律学科", 1, "REQUIRED", "専門科目"],
      ["Pythonデータ分析入門", 2000, "サンプルコードを扱う架空教材です。書き込みはない設定です。", "/assets/book-generic.svg", 4, "AVAILABLE", 2026, "情報工学基礎", "理工学部", "学門 A", 1, "REQUIRED", "専門科目"],
      ["英語アカデミック・ライティング", 800, "レポート構成を学ぶ架空教材です。表紙に小さな擦れがある設定です。", "/assets/book-generic.svg", 2, "AVAILABLE", 2025, "Academic Writing", "文学部", "人文社会学科", 1, "REFERENCE", "語学"],
    ].forEach((book) => insertBook.run(...(book as SqlValue[]), now, now));

    const insertTransaction = this.#db.prepare(`
      INSERT INTO transactions (
        book_id, buyer_id, seller_id, offered_price, buyer_approved,
        seller_approved, status, message, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTransaction.run(3, 1, 4, 900, 1, 0, "PENDING", "デモ用の購入相談です。", now, now, null);
    insertTransaction.run(
      4,
      1,
      5,
      700,
      1,
      1,
      "COMPLETED",
      "デモ用の成立済み取引です。",
      now,
      now,
      "2026-07-01T03:00:00.000Z",
    );
    const insertNotification = this.#db.prepare(`
      INSERT INTO notifications (
        user_id, transaction_id, book_id, type, message, read, created_at
      ) VALUES (?, 2, 4, 'TRANSACTION_COMPLETED', ?, 0, ?)
    `);
    insertNotification.run(1, "マーケティング基礎 のデモ取引が完了しました", now);
    insertNotification.run(5, "マーケティング基礎 のデモ取引が完了しました", now);
  }
}

export const ephemeralStore = new EphemeralStore();
