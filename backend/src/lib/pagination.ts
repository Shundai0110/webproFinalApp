import { AppError } from "../errors/AppError.js";
import { inputRecord, type InputRecord } from "./validation.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export type Pagination = {
  page: number;
  pageSize: number;
  offset: number;
};

function queryInteger(
  input: InputRecord,
  key: "page" | "pageSize",
  fallback: number,
  maximum: number,
) {
  const raw = input[key];
  if (raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new AppError(400, "VALIDATION_ERROR", `${key}は整数で指定してください`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new AppError(400, "VALIDATION_ERROR", `${key}は1〜${maximum}で指定してください`);
  }
  return value;
}

export function readPagination(rawQuery: unknown): Pagination {
  const query = inputRecord(rawQuery);
  const page = queryInteger(query, "page", 1, 10_000);
  const pageSize = queryInteger(query, "pageSize", DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function pageResult<T>(items: T[], total: number, pagination: Pagination) {
  return {
    items,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pagination.pageSize),
    },
  };
}
