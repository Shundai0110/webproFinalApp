import { expect, test } from "@playwright/test";

test("two browser contexts share a listing without allowing self-purchase", async ({ browser }) => {
  const sellerContext = await browser.newContext();
  const buyerContext = await browser.newContext();
  const sellerPage = await sellerContext.newPage();
  const buyerPage = await buyerContext.newPage();
  const title = `Browser E2E ${Date.now()}`;
  const cancelledTitle = `Cancelled Browser E2E ${Date.now()}`;

  await Promise.all([sellerPage.goto("/"), buyerPage.goto("/")]);
  await expect(sellerPage.locator("#session-name")).toHaveText("A. Suzuki");
  await buyerPage.locator("#demo-user-select").selectOption("2");
  await buyerPage.locator("#start-session").click();
  await expect(buyerPage.locator("#session-name")).toHaveText("S. Tanaka");

  await sellerPage.locator('#listing-form input[name="title"]').fill(title);
  await sellerPage.locator('#listing-form input[name="course"]').fill("ブラウザE2E演習");
  await sellerPage.locator('#listing-form input[name="price"]').fill("500");
  await sellerPage.locator("#listing-form button[type=submit]").click();
  await expect(sellerPage.locator("#toast")).toContainText("出品を追加しました");

  const sellerCard = sellerPage.locator(".book-card", { hasText: title });
  await expect(sellerCard).toHaveClass(/is-own-listing/);
  await sellerCard.focus();
  await sellerCard.press("Enter");
  await expect(sellerPage.getByRole("button", { name: "出品を取り消す" })).toBeEnabled();

  await sellerPage.locator('#listing-form input[name="title"]').fill(cancelledTitle);
  await sellerPage.locator('#listing-form input[name="course"]').fill("出品取消E2E演習");
  await sellerPage.locator('#listing-form input[name="price"]').fill("600");
  await sellerPage.locator("#listing-form button[type=submit]").click();
  const cancellableCard = sellerPage.locator(".book-card", { hasText: cancelledTitle });
  await cancellableCard.click();
  sellerPage.once("dialog", (dialog) => dialog.accept());
  await sellerPage.getByRole("button", { name: "出品を取り消す" }).click();
  await expect(sellerPage.locator("#toast")).toContainText("出品を取り消しました");
  await expect(cancellableCard).toHaveCount(0);

  await buyerPage.reload();
  await expect(buyerPage.locator("#session-name")).toHaveText("S. Tanaka");
  const buyerCard = buyerPage.locator(".book-card", { hasText: title });
  await expect(buyerCard).toBeVisible();
  await expect(buyerCard).not.toHaveClass(/is-own-listing/);
  await buyerCard.click();
  await buyerPage.getByRole("button", { name: "購入相談を開始" }).click();
  await expect(buyerPage.locator("#toast")).toContainText("購入相談を作成しました");
  const buyerTransaction = buyerPage.locator("#transaction-list li", { hasText: title });
  await expect(buyerTransaction).toBeVisible();
  await buyerTransaction.getByRole("button", { name: "購入・支払いを承諾" }).click();
  await expect(buyerTransaction.getByRole("button", { name: "承認を取り消す" })).toBeVisible();
  buyerPage.once("dialog", (dialog) => dialog.accept());
  await buyerTransaction.getByRole("button", { name: "承認を取り消す" }).click();
  await expect(buyerPage.locator("#toast")).toContainText("承認を取り消しました");
  await expect(
    buyerTransaction.getByRole("button", { name: "購入・支払いを承諾" }),
  ).toBeVisible();

  await sellerPage.reload();
  await expect(sellerPage.locator("#transaction-list")).toContainText(title);
  await sellerPage.locator(".book-card", { hasText: title }).click();
  await expect(
    sellerPage.getByRole("button", { name: "取引中のため取り消し不可" }),
  ).toBeDisabled();

  await buyerContext.close();
  await sellerContext.close();
});
