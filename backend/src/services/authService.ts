import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  FACULTIES,
  MAX_DEMO_ACCOUNTS,
  NEW_DEMO_ACCOUNT_POINTS,
} from "../domain/constants.js";
import { AppError } from "../errors/AppError.js";
import { issueDemoSession } from "../lib/demoSession.js";
import { prisma } from "../lib/prisma.js";
import {
  allowOnly,
  inputRecord,
  optionalHttpUrl,
  optionalString,
  requiredInteger,
  requiredString,
} from "../lib/validation.js";
import { findUserById, publicUserSelect, updateUser } from "../repositories/userRepository.js";
import { env } from "../config/env.js";

const ACCOUNT_FIELDS = ["nickname", "faculty", "department", "year", "iconUrl"] as const;

function readProfile(input: unknown, partial: boolean) {
  const body = inputRecord(input);
  allowOnly(body, ACCOUNT_FIELDS);
  const result: {
    nickname?: string;
    faculty?: (typeof FACULTIES)[number];
    department?: string;
    year?: number;
    iconUrl?: string | null;
  } = {};

  if (!partial || body.nickname !== undefined) result.nickname = requiredString(body, "nickname", 40);
  if (!partial || body.faculty !== undefined) {
    const faculty = requiredString(body, "faculty", 100);
    if (!FACULTIES.includes(faculty as (typeof FACULTIES)[number])) {
      throw new AppError(400, "VALIDATION_ERROR", "facultyは対応する学部から選択してください");
    }
    result.faculty = faculty as (typeof FACULTIES)[number];
  }
  if (!partial || body.department !== undefined) {
    result.department = optionalString(body, "department", 100) ?? "";
  }
  if (!partial || body.year !== undefined) result.year = requiredInteger(body, "year", 1, 6);
  if (body.iconUrl !== undefined) result.iconUrl = optionalHttpUrl(body, "iconUrl", 1000) ?? null;

  if (partial && Object.keys(result).length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "更新項目を1つ以上指定してください");
  }
  return result;
}

export async function registerDemoAccount(input: unknown) {
  if (!env.demoMode) {
    throw new AppError(503, "DEMO_MODE_DISABLED", "デモアカウント登録は無効です");
  }
  const profile = readProfile(input, false);

  const user = await prisma.$transaction(
    async (tx) => {
      const count = await tx.user.count();
      if (count >= MAX_DEMO_ACCOUNTS) {
        throw new AppError(409, "ACCOUNT_LIMIT_REACHED", "デモアカウントは合計20件までです");
      }

      // 実在の認証情報は受け取らず、サーバー生成のデモ識別子だけを永続化する。
      return tx.user.create({
        data: {
          demoUserKey: `demo-user-${randomUUID()}`,
          nickname: profile.nickname!,
          faculty: profile.faculty!,
          department: profile.department!,
          year: profile.year!,
          iconUrl: profile.iconUrl,
          pointBalance: NEW_DEMO_ACCOUNT_POINTS,
        },
        select: publicUserSelect,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  return { user, session: { type: "Bearer", ...issueDemoSession(user.id) } };
}

export async function getOwnProfile(userId: number) {
  const user = await findUserById(userId);
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "デモアカウントが見つかりません");
  return user;
}

export async function updateOwnProfile(userId: number, input: unknown) {
  await getOwnProfile(userId);
  const profile = readProfile(input, true);
  return updateUser(userId, profile);
}
