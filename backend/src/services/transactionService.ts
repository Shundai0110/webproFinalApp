import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { nextApprovalState } from "../domain/transactionPolicy.js";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/prisma.js";
import { ephemeralStore } from "../lib/ephemeralStore.js";
import { pageResult, readPagination } from "../lib/pagination.js";
import {
  allowOnly,
  inputRecord,
  optionalString,
  requiredInteger,
  requiredString,
} from "../lib/validation.js";
import {
  findTransactionById,
  transactionInclude,
} from "../repositories/transactionRepository.js";
import { getOwnProfile } from "./authService.js";

export async function requestTransaction(currentUserId: number, input: unknown) {
  const body = inputRecord(input);
  allowOnly(body, ["bookId", "offeredPrice", "message"]);
  const bookId = requiredInteger(body, "bookId", 1);
  const offeredPrice = requiredInteger(body, "offeredPrice", 0);
  const message = optionalString(body, "message", 2000);
  await getOwnProfile(currentUserId);

  if (env.storageMode === "ephemeral") {
    return ephemeralStore.requestTransaction(currentUserId, bookId, offeredPrice, message);
  }

  return prisma.$transaction(
    async (tx) => {
      const book = await tx.book.findUnique({ where: { id: bookId } });
      if (!book) throw new AppError(404, "BOOK_NOT_FOUND", "教科書が見つかりません");
      if (book.status !== "AVAILABLE") {
        throw new AppError(409, "BOOK_NOT_AVAILABLE", "この教科書は購入相談を開始できません");
      }
      if (book.sellerId === currentUserId) {
        throw new AppError(400, "SELF_PURCHASE", "自分の出品は購入できません");
      }

      const buyer = await tx.user.findUnique({ where: { id: currentUserId } });
      if (!buyer) throw new AppError(401, "UNAUTHENTICATED", "購入者が見つかりません");
      if (buyer.pointBalance < offeredPrice) {
        throw new AppError(409, "INSUFFICIENT_POINTS", "仮想ポイント残高が不足しています");
      }

      // 条件付き更新により、同じBookへの同時購入相談を1件だけに限定する。
      const reserved = await tx.book.updateMany({
        where: { id: book.id, status: "AVAILABLE" },
        data: { status: "NEGOTIATING" },
      });
      if (reserved.count !== 1) {
        throw new AppError(409, "BOOK_NOT_AVAILABLE", "別の購入相談が開始されています");
      }

      return tx.transaction.create({
        data: {
          bookId: book.id,
          buyerId: currentUserId,
          sellerId: book.sellerId,
          offeredPrice,
          message,
          status: "PENDING",
        },
        include: transactionInclude,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function getTransaction(currentUserId: number, id: number) {
  const transaction =
    env.storageMode === "ephemeral"
      ? ephemeralStore.getTransaction(id)
      : await findTransactionById(id);
  if (!transaction) {
    throw new AppError(404, "TRANSACTION_NOT_FOUND", "取引が見つかりません");
  }
  if (transaction.buyerId !== currentUserId && transaction.sellerId !== currentUserId) {
    throw new AppError(403, "FORBIDDEN", "取引当事者だけが取引を参照できます");
  }
  return transaction;
}

export async function approveTransaction(currentUserId: number, id: number, input: unknown) {
  const body = inputRecord(input);
  allowOnly(body, ["action"]);
  if (requiredString(body, "action", 20) !== "APPROVE") {
    throw new AppError(400, "VALIDATION_ERROR", "actionはAPPROVEを指定してください");
  }

  if (env.storageMode === "ephemeral") {
    return ephemeralStore.approveTransaction(currentUserId, id);
  }

  return prisma.$transaction(
    async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: transactionInclude,
      });
      if (!transaction) {
        throw new AppError(404, "TRANSACTION_NOT_FOUND", "取引が見つかりません");
      }
      if (transaction.status !== "PENDING") {
        throw new AppError(409, "TRANSACTION_CLOSED", "この取引はすでに終了しています");
      }

      const approval = nextApprovalState(transaction, currentUserId);
      if (!approval.shouldComplete) {
        return tx.transaction.update({
          where: { id },
          data: {
            buyerApproved: approval.buyerApproved,
            sellerApproved: approval.sellerApproved,
          },
          include: transactionInclude,
        });
      }

      if (transaction.book.status !== "NEGOTIATING") {
        throw new AppError(409, "BOOK_STATE_CONFLICT", "教科書が取引中ではありません");
      }

      // 残高条件をWHEREへ含め、成立直前の残高不足でもマイナス残高を作らない。
      const debited = await tx.user.updateMany({
        where: {
          id: transaction.buyerId,
          pointBalance: { gte: transaction.offeredPrice },
        },
        data: { pointBalance: { decrement: transaction.offeredPrice } },
      });
      if (debited.count !== 1) {
        throw new AppError(409, "INSUFFICIENT_POINTS", "仮想ポイント残高が不足しています");
      }
      await tx.user.update({
        where: { id: transaction.sellerId },
        data: { pointBalance: { increment: transaction.offeredPrice } },
      });

      const sold = await tx.book.updateMany({
        where: { id: transaction.bookId, status: "NEGOTIATING" },
        data: { status: "SOLD" },
      });
      if (sold.count !== 1) {
        throw new AppError(409, "BOOK_STATE_CONFLICT", "教科書の状態が変更されています");
      }

      const completedAt = new Date();
      const completed = await tx.transaction.update({
        where: { id },
        data: {
          buyerApproved: true,
          sellerApproved: true,
          status: "COMPLETED",
          completedAt,
        },
        include: transactionInclude,
      });

      // 外部メールや決済通知は使わず、取引当事者向けの画面内通知だけを保存する。
      await tx.notification.createMany({
        data: [
          {
            userId: transaction.buyerId,
            transactionId: transaction.id,
            type: "TRANSACTION_COMPLETED",
            message: `${transaction.book.title} の取引が完了し、${transaction.offeredPrice} ptを支払いました`,
          },
          {
            userId: transaction.sellerId,
            transactionId: transaction.id,
            type: "TRANSACTION_COMPLETED",
            message: `${transaction.book.title} の取引が完了し、${transaction.offeredPrice} ptを受け取りました`,
          },
        ],
      });

      return completed;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function listOwnNotifications(currentUserId: number, rawQuery: unknown) {
  await getOwnProfile(currentUserId);
  const pagination = readPagination(rawQuery);
  if (env.storageMode === "ephemeral") {
    return pageResult(
      ephemeralStore.listNotifications(currentUserId, pagination.pageSize, pagination.offset),
      ephemeralStore.countNotifications(currentUserId),
      pagination,
    );
  }
  const where = { userId: currentUserId };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.offset,
      take: pagination.pageSize,
    }),
    prisma.notification.count({ where }),
  ]);
  return pageResult(items, total, pagination);
}

export async function listOwnTransactions(currentUserId: number, rawQuery: unknown) {
  await getOwnProfile(currentUserId);
  const pagination = readPagination(rawQuery);
  if (env.storageMode === "ephemeral") {
    return pageResult(
      ephemeralStore.listTransactions(currentUserId, pagination.pageSize, pagination.offset),
      ephemeralStore.countTransactions(currentUserId),
      pagination,
    );
  }
  const where = { OR: [{ buyerId: currentUserId }, { sellerId: currentUserId }] };
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: { createdAt: "desc" },
      skip: pagination.offset,
      take: pagination.pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);
  return pageResult(items, total, pagination);
}
