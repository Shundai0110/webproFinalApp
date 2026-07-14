import type { BookStatus, MaterialType, Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { BOOK_STATUSES, MATERIAL_TYPES } from "../domain/constants.js";
import { AppError } from "../errors/AppError.js";
import {
  allowOnly,
  inputRecord,
  optionalEnum,
  optionalHttpUrl,
  optionalInteger,
  optionalString,
  requiredInteger,
  requiredString,
  type InputRecord,
} from "../lib/validation.js";
import {
  createBook,
  findBookById,
  findBooks,
  updateBook,
} from "../repositories/bookRepository.js";
import { getOwnProfile } from "./authService.js";
import { calculateRelatedScore } from "./rankingService.js";
import {
  ephemeralStore,
  type EphemeralBookInput,
  type EphemeralBookQuery,
} from "../lib/ephemeralStore.js";

const BOOK_FIELDS = [
  "title",
  "price",
  "description",
  "imageUrl",
  "usedLesson",
  "usedYear",
  "usedFaculty",
  "usedDepartment",
  "targetYear",
  "materialType",
  "category",
] as const;
const BOOK_UPDATE_FIELDS = [...BOOK_FIELDS, "status"] as const;
const BOOK_QUERY_FIELDS = [
  "q",
  "faculty",
  "department",
  "year",
  "usedYear",
  "materialType",
  "category",
  "status",
] as const;

function queryString(input: InputRecord, key: string, maxLength: number) {
  return optionalString(input, key, maxLength);
}

function queryInteger(input: InputRecord, key: string, minimum: number, maximum: number) {
  const raw = input[key];
  if (raw === undefined || raw === "") return undefined;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new AppError(400, "VALIDATION_ERROR", `${key}は整数で指定してください`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${key}は${minimum}〜${maximum}で指定してください`,
    );
  }
  return value;
}

function readBookInput(input: unknown, partial: boolean) {
  const body = inputRecord(input);
  allowOnly(body, partial ? BOOK_UPDATE_FIELDS : BOOK_FIELDS);
  const data: Prisma.BookUncheckedCreateInput & { status?: BookStatus } = {} as Prisma.BookUncheckedCreateInput;

  if (!partial || body.title !== undefined) data.title = requiredString(body, "title", 255);
  if (!partial || body.price !== undefined) data.price = requiredInteger(body, "price", 0);
  if (!partial || body.usedLesson !== undefined) {
    data.usedLesson = requiredString(body, "usedLesson", 255);
  }
  if (!partial || body.usedYear !== undefined) {
    data.usedYear = requiredInteger(body, "usedYear", 2000, 2100);
  }
  if (body.description !== undefined) data.description = optionalString(body, "description", 5000) ?? null;
  if (body.imageUrl !== undefined) data.imageUrl = optionalHttpUrl(body, "imageUrl", 1000) ?? null;
  if (body.usedFaculty !== undefined) data.usedFaculty = optionalString(body, "usedFaculty", 100) ?? null;
  if (body.usedDepartment !== undefined) {
    data.usedDepartment = optionalString(body, "usedDepartment", 100) ?? null;
  }
  if (body.targetYear !== undefined) data.targetYear = optionalInteger(body, "targetYear", 1, 6) ?? null;
  if (!partial || body.materialType !== undefined) {
    data.materialType =
      optionalEnum(body, "materialType", MATERIAL_TYPES) ?? ("REQUIRED" as MaterialType);
  }
  if (body.category !== undefined) data.category = optionalString(body, "category", 100) ?? null;
  if (body.status !== undefined) {
    const status = optionalEnum(body, "status", BOOK_STATUSES);
    if (status !== "CANCELLED") {
      throw new AppError(
        400,
        "INVALID_STATUS_TRANSITION",
        "利用者が指定できるstatusはCANCELLEDだけです",
      );
    }
    data.status = status;
  }

  if (partial && Object.keys(data).length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "更新項目を1つ以上指定してください");
  }
  return data;
}

export async function listBooks(userId: number, rawQuery: unknown) {
  const user = await getOwnProfile(userId);
  const query = inputRecord(rawQuery);
  allowOnly(query, BOOK_QUERY_FIELDS);
  const q = queryString(query, "q", 255);
  const status = optionalEnum(query, "status", BOOK_STATUSES);
  const materialType = optionalEnum(query, "materialType", MATERIAL_TYPES);
  if (env.storageMode === "ephemeral") {
    const books = ephemeralStore.listBooks({
      q,
      status,
      materialType,
      faculty: queryString(query, "faculty", 100),
      department: queryString(query, "department", 100),
      year: queryInteger(query, "year", 1, 6),
      usedYear: queryInteger(query, "usedYear", 2000, 2100),
      category: queryString(query, "category", 100),
    } satisfies EphemeralBookQuery);
    return books
      .map((book) => ({ ...book, relatedScore: calculateRelatedScore(book, user, q) }))
      .sort((left, right) => right.relatedScore - left.relatedScore || right.usedYear - left.usedYear);
  }
  const where: Prisma.BookWhereInput = {
    status: status ?? { not: "CANCELLED" },
    usedFaculty: queryString(query, "faculty", 100),
    usedDepartment: queryString(query, "department", 100),
    targetYear: queryInteger(query, "year", 1, 6),
    usedYear: queryInteger(query, "usedYear", 2000, 2100),
    materialType,
    category: queryString(query, "category", 100),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { usedLesson: { contains: q } },
          ],
        }
      : {}),
  };
  Object.keys(where).forEach((key) => {
    if (where[key as keyof Prisma.BookWhereInput] === undefined) {
      delete where[key as keyof Prisma.BookWhereInput];
    }
  });

  const books = await findBooks(where);
  return books
    .map((book) => ({ ...book, relatedScore: calculateRelatedScore(book, user, q) }))
    .sort((left, right) => right.relatedScore - left.relatedScore || right.usedYear - left.usedYear);
}

export async function getBook(id: number) {
  const book =
    env.storageMode === "ephemeral" ? ephemeralStore.getBook(id) : await findBookById(id);
  if (!book) throw new AppError(404, "BOOK_NOT_FOUND", "教科書が見つかりません");
  return book;
}

export async function addBook(userId: number, input: unknown) {
  await getOwnProfile(userId);
  const data = readBookInput(input, false);
  if (env.storageMode === "ephemeral") {
    return ephemeralStore.createBook(userId, data as EphemeralBookInput);
  }
  return createBook({ ...data, sellerId: userId, status: "AVAILABLE" });
}

export async function editBook(userId: number, id: number, input: unknown) {
  const book = await getBook(id);
  if (book.sellerId !== userId) {
    throw new AppError(403, "FORBIDDEN", "出品者だけが教科書を更新できます");
  }
  if (book.status !== "AVAILABLE") {
    throw new AppError(409, "BOOK_NOT_EDITABLE", "出品中の教科書だけを更新できます");
  }
  const data = readBookInput(input, true);
  if (env.storageMode === "ephemeral") {
    return ephemeralStore.updateBook(id, data as EphemeralBookInput);
  }
  return updateBook(id, data);
}

export async function cancelBook(userId: number, id: number) {
  const book = await getBook(id);
  if (book.sellerId !== userId) {
    throw new AppError(403, "FORBIDDEN", "出品者だけが出品を取り消せます");
  }
  if (book.status !== "AVAILABLE") {
    throw new AppError(409, "BOOK_NOT_CANCELLABLE", "出品中の教科書だけを取り消せます");
  }
  if (env.storageMode === "ephemeral") {
    return ephemeralStore.updateBook(id, { status: "CANCELLED" });
  }
  return updateBook(id, { status: "CANCELLED" });
}
