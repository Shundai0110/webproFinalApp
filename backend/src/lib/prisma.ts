import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { env } from "../config/env.js";

// Prisma 7は直接接続でもdriver adapterを要求する。外部DBサービスには接続しない。
const adapter = new PrismaMariaDb(env.databaseUrl);
export const prisma = new PrismaClient({ adapter });
