import { AppError } from "../errors/AppError.js";

export type InputRecord = Record<string, unknown>;

export function inputRecord(value: unknown): InputRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "VALIDATION_ERROR", "JSONオブジェクトを指定してください");
  }
  return value as InputRecord;
}

export function allowOnly(input: InputRecord, allowedKeys: readonly string[]) {
  const unknownKey = Object.keys(input).find((key) => !allowedKeys.includes(key));
  if (unknownKey) {
    throw new AppError(400, "VALIDATION_ERROR", `未対応の入力項目です: ${unknownKey}`);
  }
}

export function requiredString(
  input: InputRecord,
  key: string,
  maxLength: number,
): string {
  const value = input[key];
  if (typeof value !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", `${key}は文字列で指定してください`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${key}は1〜${maxLength}文字で指定してください`,
    );
  }
  return normalized;
}

export function optionalString(
  input: InputRecord,
  key: string,
  maxLength: number,
): string | undefined {
  const value = input[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", `${key}は文字列で指定してください`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${key}は${maxLength}文字以内で指定してください`,
    );
  }
  return normalized || undefined;
}

export function requiredInteger(
  input: InputRecord,
  key: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const value = input[key];
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${key}は${minimum}〜${maximum}の整数で指定してください`,
    );
  }
  return value as number;
}

export function optionalInteger(
  input: InputRecord,
  key: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number | undefined {
  if (input[key] === undefined || input[key] === null || input[key] === "") return undefined;
  return requiredInteger(input, key, minimum, maximum);
}

export function optionalEnum<T extends string>(
  input: InputRecord,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = input[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${key}は${allowed.join(" / ")}のいずれかを指定してください`,
    );
  }
  return value as T;
}

export function parsePositiveId(value: unknown, label = "id"): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError(400, "VALIDATION_ERROR", `${label}が不正です`);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, "VALIDATION_ERROR", `${label}が不正です`);
  }
  return id;
}

export function optionalHttpUrl(
  input: InputRecord,
  key: string,
  maxLength: number,
): string | undefined {
  const value = optionalString(input, key, maxLength);
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    return parsed.toString();
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", `${key}はHTTP(S) URLで指定してください`);
  }
}
