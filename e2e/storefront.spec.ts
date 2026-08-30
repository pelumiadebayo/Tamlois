import { expect, test } from "@playwright/test";

const storefrontUrl = "https://paystack.shop/tamls";
const featuredProductUrl =
  "https://paystack.shop/tamls?product=botanical-scalp-oil-hkxrdj";
const moisturisingHairMistUrl =
  "https://paystack.shop/tamls?product=moisturising-hair-mist-qfygyk";
const scalpCleansingTreatmentUrl =
  "https://paystack.shop/tamls?product=scalp-cleansing-treatment-mhxror";

test("shop is a branded, catalogue-free transition to Paystack Storefront", async ({
  page,
}) => {
  await page.goto("/#/shop");
  await expect(
    page.getByRole("heading", {
      name: "One official place to shop",
    }),
  ).toBeVisible();
  const action = page.getByRole("link", {
    name: /Visit the Tamlois Storefront.*new tab/i,
  });
  await expect(action).toHaveAttribute("href", storefrontUrl);
  await expect(action).toHaveAttribute("target", "_blank");
  await expect(action).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByText(/demo clarifying|demo hydration|Botanical scalp oil/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Buy|View product/i })).toHaveCount(0);
});

test("homepage and navigation share the intentional Storefront journey", async ({
  page,
}) => {
  await page.goto("/#/");
  await expect(
    page.getByRole("heading", { name: "Care continues at home" }),
  ).toBeVisible();
  await expect(page.getByText("Scalp cleansing treatment")).toBeVisible();
  await expect(page.getByText("Moisturising hair mist")).toBeVisible();
  await expect(page.getByText("Botanical scalp oil")).toBeVisible();
  const featuredProducts = page.getByRole("link", {
    name: /Shop .* on the official Paystack Storefront.*new tab/i,
  });
  await expect(featuredProducts).toHaveCount(3);
  for (const product of await featuredProducts.all()) {
    await expect(product).toHaveAttribute("target", "_blank");
    await expect(product).toHaveAttribute("rel", "noopener noreferrer");
  }
  await expect(
    page.getByRole("link", {
      name: /Shop Moisturising hair mist on the official Paystack Storefront.*new tab/i,
    }),
  ).toHaveAttribute("href", moisturisingHairMistUrl);
  await expect(
    page.getByRole("link", {
      name: /Shop Scalp cleansing treatment on the official Paystack Storefront.*new tab/i,
    }),
  ).toHaveAttribute("href", scalpCleansingTreatmentUrl);
  await expect(
    page.getByRole("link", {
      name: /Shop Botanical scalp oil on the official Paystack Storefront.*new tab/i,
    }),
  ).toHaveAttribute("href", featuredProductUrl);
  await page.getByRole("link", { name: "Shop", exact: true }).first().click();
  await expect(page).toHaveURL(/#\/shop$/);
});

test("keyboard activation requests the exact external Storefront safely", async ({
  context,
  page,
}) => {
  await context.route(storefrontUrl, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>Tamlois Storefront</title>" }),
  );
  await page.goto("/#/shop");
  const action = page.getByRole("link", {
    name: /Visit the Tamlois Storefront.*new tab/i,
  });
  await action.focus();
  await expect(action).toBeFocused();
  const popupPromise = page.waitForEvent("popup");
  await action.press("Enter");
  const popup = await popupPromise;
  await expect(popup).toHaveURL(storefrontUrl);
});

test("shop and homepage promotions do not overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/#/", "/#/shop"]) {
    await page.goto(route);
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  }
});

test("admin settings direct retail management to Paystack without product CRUD", async ({
  page,
}) => {
  await page.goto("/#/admin/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Paystack Storefront" })).toBeVisible();
  await expect(page.getByText(/managed in Paystack Storefront/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Paystack Storefront.*new tab/i })).toHaveAttribute(
    "href",
    storefrontUrl,
  );
  await expect(page.getByRole("button", { name: /Add product|Upload product image|Manage stock/i })).toHaveCount(0);
});
