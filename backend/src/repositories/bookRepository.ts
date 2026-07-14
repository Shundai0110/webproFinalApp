import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const bookInclude = {
  seller: {
    select: {
      id: true,
      nickname: true,
      faculty: true,
      department: true,
      year: true,
      iconUrl: true,
    },
  },
} satisfies Prisma.BookInclude;

export function findBooks(where: Prisma.BookWhereInput, skip = 0, take = 20) {
  return prisma.book.findMany({
    where,
    include: bookInclude,
    orderBy: [{ usedYear: "desc" }, { createdAt: "desc" }],
    skip,
    take,
  });
}

export function countBooks(where: Prisma.BookWhereInput) {
  return prisma.book.count({ where });
}

export function findBookById(id: number) {
  return prisma.book.findUnique({ where: { id }, include: bookInclude });
}

export function createBook(data: Prisma.BookUncheckedCreateInput) {
  return prisma.book.create({ data, include: bookInclude });
}

export function updateBook(id: number, data: Prisma.BookUpdateInput) {
  return prisma.book.update({ where: { id }, data, include: bookInclude });
}
