import { expect, test } from "@playwright/test";

const enabled = process.env.RUN_FIREBASE_E2E === "true";
const ownerEmail = process.env.FIREBASE_ADMIN_EMAIL || "";
const ownerPassword = process.env.FIREBASE_ADMIN_PASSWORD || "";

test.skip(!enabled, "Set RUN_FIREBASE_E2E=true and start the Auth and Firestore emulators.");

test("owner authentication restores, protects routes and signs out", async ({ page }) => {
  await page.goto("/#/admin");
  await expect(page).toHaveURL(/admin\/login/);
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Services" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Services" })).toBeVisible();
  await page.getByRole("button", { name: /Sign out/i }).click();
  await expect(page).toHaveURL(/admin\/login/);
});

test("owner creates, edits and archives a Firestore service while public content follows", async ({ page }) => {
  await page.goto("/#/admin/login");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Services" }).click();
  await page.getByRole("link", { name: /New service|Create first service/ }).first().click();
  await page.getByLabel("Name").fill("Emulator scalp consultation");
  await page.getByLabel("Summary").fill("A production-shaped emulator service.");
  await page.getByLabel("Image URL").fill("https://example.com/scalp.jpg");
  await page.getByLabel("Image alt text").fill("Scalp consultation room");
  await page.getByRole("button", { name: /Save service/i }).click();
  await page.goto("/#/services");
  await expect(page.getByText("Emulator scalp consultation")).toBeVisible();
  await page.goto("/#/booking?category=trichology");
  await page.getByTestId("policy-consent").check();
  await page.getByRole("button", { name: /Start booking/ }).click();
  await expect(page.getByRole("button", { name: /Emulator scalp consultation/ })).toBeVisible();

  await page.goto("/#/admin/services");
  await page.getByRole("link", { name: "Edit Emulator scalp consultation" }).click();
  await page.getByLabel("Short summary").fill("An updated production-shaped emulator service.");
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByText("Emulator scalp consultation", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Edit Emulator scalp consultation" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive service" }).click();
  await page.goto("/#/services");
  await expect(page.getByText("Emulator scalp consultation", { exact: true })).toHaveCount(0);
});

test("owner creates a partial-day block from the admin availability page", async ({ page }) => {
  await page.goto("/#/admin/login");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Availability" }).click();

  const date = new Date(Date.now() + 14 * 86400000);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  const value = date.toISOString().slice(0, 10);
  await page.getByLabel("Date").fill(value);
  await page.getByLabel("Start (optional)").fill("10:15");
  await page.getByLabel("End (optional)").fill("11:15");
  await page.getByLabel("Internal reason").fill("Emulator staff meeting");
  await page.getByRole("button", { name: "Block time" }).click();

  await expect(page.getByText(`${value} 10:15-11:15`)).toBeVisible();
  await expect(page.getByText("Emulator staff meeting")).toBeVisible();
});
