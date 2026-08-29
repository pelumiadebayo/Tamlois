import { expect, test } from "@playwright/test";

test("static gallery uses responsive assets, provenance and Load More on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/gallery");
  const images = page.locator(".gallery-image img");
  await expect(images).toHaveCount(4);
  await expect(images.first()).toHaveAttribute("loading", "lazy");
  await expect(images.nth(1)).toHaveAttribute("loading", "lazy");
  await expect(images.first()).toHaveAttribute("srcset", /480w.*765w/);
  await expect(images.first()).toHaveAttribute("width", "765");
  await expect(images.first()).toHaveAttribute("height", "1280");
  await expect(page.getByText("Tamlois salon image", { exact: true })).toBeVisible();
  await expect(page.getByText("Licensed placeholder").first()).toBeVisible();
  await page.getByRole("button", { name: "Load more images" }).click();
  await expect(images).toHaveCount(5);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("gallery keeps the editorial grid and filtering at desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/gallery");
  const cards = page.locator(".gallery-item");
  const first = await cards.first().boundingBox();
  const third = await cards.nth(2).boundingBox();
  expect(first).not.toBeNull();
  expect(third).not.toBeNull();
  expect(first!.width).toBeGreaterThan(third!.width);
  await page.getByRole("button", { name: "Trichology", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(page.getByText(/calm setting for discussing/i)).toBeVisible();
});
