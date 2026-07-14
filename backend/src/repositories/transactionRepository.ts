import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const transactionInclude = {
  book: true,
  buyer: {
    select: {
      id: true,
      nickname: true,
      faculty: true,
      department: true,
      year: true,
      pointBalance: true,
    },
  },
  seller: {
    select: {
      id: true,
      nickname: true,
      faculty: true,
      department: true,
      year: true,
      pointBalance: true,
    },
  },
} satisfies Prisma.TransactionInclude;

export function findTransactionById(id: number) {
  return prisma.transaction.findUnique({ where: { id }, include: transactionInclude });
}
