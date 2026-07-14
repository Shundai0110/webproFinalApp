import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const publicUserSelect = {
  id: true,
  demoUserKey: true,
  nickname: true,
  year: true,
  faculty: true,
  department: true,
  iconUrl: true,
  pointBalance: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}

export function updateUser(
  id: number,
  data: Prisma.UserUpdateInput,
) {
  return prisma.user.update({ where: { id }, data, select: publicUserSelect });
}
