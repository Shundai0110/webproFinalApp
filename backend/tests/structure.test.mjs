import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function exists(path) {
  await access(join(root, path));
}

test("backend base files exist", async () => {
  await Promise.all([
    exists("package.json"),
    exists("tsconfig.json"),
    exists(".env.example"),
    exists("src/app.ts"),
    exists("src/server.ts"),
    exists("src/routes/healthRoutes.ts"),
    exists("src/routes/authRoutes.ts"),
    exists("src/routes/userRoutes.ts"),
    exists("src/routes/bookRoutes.ts"),
    exists("src/routes/transactionRoutes.ts"),
    exists("src/services/authService.ts"),
    exists("src/services/bookService.ts"),
    exists("src/services/transactionService.ts"),
    exists("src/middlewares/errorHandler.ts"),
    exists("src/lib/prisma.ts"),
    exists("prisma/schema.prisma"),
  ]);
});

test("prisma schema defines the API domain models", async () => {
  const schema = await readFile(join(root, "prisma", "schema.prisma"), "utf8");
  assert.match(schema, /datasource db/);
  assert.match(schema, /^model User/m);
  assert.match(schema, /^model Book/m);
  assert.match(schema, /^model Transaction/m);
  assert.match(schema, /^model Notification/m);
  assert.match(schema, /pointBalance Int\s+@default\(5000\)/);
});
