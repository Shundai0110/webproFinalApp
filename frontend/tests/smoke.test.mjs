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
  assert.match(html, /id="account-form"/);
  assert.match(html, /初期残高 5,000円（デモ）/);
  assert.doesNotMatch(html, /\bpt\b/);
});

test("seed data contains marketplace states", async () => {
  const data = await readFile(join(root, "src", "data.js"), "utf8");
  assert.match(data, /AVAILABLE/);
  assert.match(data, /NEGOTIATING/);
  assert.match(data, /SOLD/);
  assert.match(data, /REQUIRED/);
  assert.match(data, /REFERENCE/);
  assert.match(data, /ミクロ経済学ワークブック/);
  assert.match(data, /憲法判例ガイド/);
  assert.match(data, /Pythonデータ分析入門/);
  assert.match(data, /英語アカデミック・ライティング/);
});

test("api client exposes the backend API boundary", async () => {
  const apiClient = await readFile(join(root, "src", "apiClient.js"), "utf8");
  assert.match(apiClient, /export function getSession/);
  assert.match(apiClient, /export function listBooks/);
  assert.match(apiClient, /export async function initializeApi/);
  assert.match(apiClient, /export async function createListing/);
  assert.match(apiClient, /export async function cancelListing/);
  assert.match(apiClient, /export async function requestPurchase/);
  assert.match(apiClient, /export async function approveTransaction/);
  assert.match(apiClient, /export async function cancelPurchaseRequest/);
  assert.match(apiClient, /export async function revokeTransactionApproval/);
  assert.match(apiClient, /export function listNotifications/);
  assert.match(apiClient, /export async function startDemoSession/);
  assert.match(apiClient, /export async function updateProfile/);
  assert.match(apiClient, /export async function createDemoAccount/);
  assert.match(apiClient, /export async function createComment/);
  assert.match(apiClient, /export function listComments/);
  assert.match(apiClient, /fetch\(`\$\{API_BASE\}/);
  assert.doesNotMatch(apiClient, /localStorage/);
});

test("own listings have a visible marker", async () => {
  const app = await readFile(join(root, "src", "app.js"), "utf8");
  const styles = await readFile(join(root, "styles.css"), "utf8");
  assert.match(app, /is-own-listing/);
  assert.match(app, /自分の出品/);
  assert.match(styles, /\.book-card\.is-own-listing/);
});

test("design theme and whole-card selection are applied", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  const app = await readFile(join(root, "src", "app.js"), "utf8");
  const styles = await readFile(join(root, "styles.css"), "utf8");
  assert.match(styles, /--brand: #001e62/);
  assert.match(styles, /--action: #fdd000/);
  assert.match(styles, /\.brand-mark\s*{[\s\S]*background: var\(--action\)/);
  assert.match(styles, /\.primary-button\s*{[\s\S]*background: var\(--action\)/);
  assert.match(styles, /\.site-header\s*{[\s\S]*position: sticky/);
  assert.match(styles, /\.book-card\.is-own-listing\s*{[\s\S]*background: #e6efff/);
  assert.match(styles, /\.listing-form-section\s*{[\s\S]*border-top: 2px solid var\(--brand\)/);
  assert.match(html, /<header class="site-header">[\s\S]*id="books" class="toolbar"/);
  assert.match(styles, /\.transaction-panel \.panel-heading h2[\s\S]*white-space: nowrap/);
  assert.match(app, /card\.setAttribute\("role", "button"\)/);
  assert.match(app, /card\.addEventListener\("click", \(\) => selectBook\(book\.id\)\)/);
  assert.doesNotMatch(app, /action\.textContent = "詳細"/);
});

test("payment UI is demo points only", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  const app = await readFile(join(root, "src", "app.js"), "utf8");
  assert.match(app, /デモ円支払い/);
  assert.match(app, /換金不可・現金価値なし/);
  assert.match(app, /toLocaleString\("ja-JP"\)}円/);
  assert.doesNotMatch(app, /toLocaleString\("ja-JP"\)} pt/);
  assert.match(app, /購入・支払いを承諾/);
  assert.doesNotMatch(html, /card-number|cvc|bank-account/i);
});

test("comment UI uses text content and does not request real contact details", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  const app = await readFile(join(root, "src", "app.js"), "utf8");
  assert.match(app, /createCommentsPanel/);
  assert.match(app, /body\.textContent = comment\.body/);
  assert.match(app, /実在する連絡先や個人情報は入力しないでください/);
  assert.doesNotMatch(html, /type="(?:email|tel|file)"/i);
});
