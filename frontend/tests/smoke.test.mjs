import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("HTML loads the application entrypoint", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  assert.match(html, /src\/app\.js/);
  assert.match(html, /id="book-list"/);
  assert.match(html, /id="listing-form"/);
  assert.match(html, /id="demo-user-select"/);
  assert.match(html, /id="profile-form"/);
});

test("seed data contains marketplace states", async () => {
  const data = await readFile(join(root, "src", "data.js"), "utf8");
  assert.match(data, /AVAILABLE/);
  assert.match(data, /NEGOTIATING/);
  assert.match(data, /SOLD/);
  assert.match(data, /REQUIRED/);
  assert.match(data, /REFERENCE/);
});

test("api client exposes future backend seams", async () => {
  const apiClient = await readFile(join(root, "src", "apiClient.js"), "utf8");
  assert.match(apiClient, /export function getSession/);
  assert.match(apiClient, /export function listBooks/);
  assert.match(apiClient, /export function createListing/);
  assert.match(apiClient, /export function requestPurchase/);
  assert.match(apiClient, /export function startDemoSession/);
  assert.match(apiClient, /export function updateProfile/);
});
