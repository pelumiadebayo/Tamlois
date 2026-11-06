import { expect, test } from "@playwright/test";

const storefrontUrl = "https://paystack.shop/tamls";
const importedUrl = "https://paystack.shop/tamls?product=e2e-product";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/");
  await page.evaluate(() => localStorage.removeItem("tamlois-products-demo-v1"));
});

test("public shop renders products, filters them and uses safe Paystack checkout", async ({ page }) => {
  await page.goto("/#/shop");
  await expect(page.getByRole("heading", { name: "Care that continues at home" })).toBeVisible();
  await expect(page.getByText("Botanical scalp oil")).toBeVisible();
  await page.getByPlaceholder("Search products").fill("moisturising");
  await expect(page.getByText("Moisturising hair mist")).toBeVisible();
  await expect(page.getByText("Botanical scalp oil")).toHaveCount(0);
  const shopAll = page.getByRole("link", { name: /Shop all on Paystack.*new tab/i });
  await expect(shopAll).toHaveAttribute("href", storefrontUrl);
  await expect(shopAll).toHaveAttribute("rel", "noopener noreferrer");
  const buy = page.getByRole("link", { name: /Buy Moisturising hair mist on Paystack/i });
  await expect(buy).toHaveAttribute("href", /paystack[.]shop\/tamls[?]product=moisturising-hair-mist/);
});

test("owner imports, previews, publishes and preserves an override through sync", async ({ page }) => {
  await page.goto("/#/admin/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Products" }).click();
  await expect(page.getByText(/Demo data/)).toBeVisible();
  await page.getByRole("button", { name: "Import product" }).click();
  await page.getByLabel("Paystack product URL (required)").fill(importedUrl);
  await page.getByRole("button", { name: "Import and preview" }).click();
  await expect(page.getByRole("heading", { name: "Product display" })).toBeVisible();
  await page.getByLabel("Homepage title override").fill("E2E scalp treatment");
  await page.getByLabel("Visible on website").check();
  await page.getByLabel("Featured on homepage").check();
  await page.getByRole("button", { name: "Save display settings" }).click();
  await expect(page.getByRole("row").filter({ hasText: "E2E scalp treatment" })).toBeVisible();
  await page.getByRole("button", { name: "Sync Storefront" }).click();
  await expect(page.getByText("Storefront synchronization completed.")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "E2E scalp treatment" })).toBeVisible();
  await page.goto("/#/");
  await expect(page.getByText("E2E scalp treatment")).toBeVisible();
  await expect(page.getByRole("link", { name: /Buy E2E scalp treatment on Paystack/i })).toHaveAttribute("href", importedUrl);
});

test("invalid product links are rejected and hidden products leave public pages", async ({ page }) => {
  await page.goto("/#/admin/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("button", { name: "Import product" }).click();
  await page.getByLabel("Paystack product URL (required)").fill("https://example.com/product");
  await page.getByRole("button", { name: "Import and preview" }).click();
  await expect(page.getByRole("dialog", { name: "Import Paystack product" }).getByRole("alert")).toContainText("paystack.shop/tamls");
  await page.getByRole("button", { name: "Close import dialog" }).click();
  await page.getByRole("button", { name: "Hide Botanical scalp oil" }).first().click();
  await page.goto("/#/shop");
  await expect(page.getByText("Botanical scalp oil")).toHaveCount(0);
});

test("product administration and public catalogue do not overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/shop");
  await expect(page.getByRole("heading", { name: "Shop products" })).toBeVisible();
  let widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  await page.goto("/#/admin/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Open admin navigation" }).click();
  await page.getByRole("link", { name: "Products" }).click();
  await expect(page.getByRole("button", { name: "Import product" })).toBeVisible();
  widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
});
