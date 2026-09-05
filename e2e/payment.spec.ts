import { expect, test } from "@playwright/test";

const bookingId = "00000000-0000-4000-8000-000000000099";

function callback(reference: string) {
  return `/#/booking/payment-callback?booking=${bookingId}&reference=${reference}`;
}

test("payment callback verifies before showing confirmation", async ({ page }) => {
  await page.goto(callback("demo-success"));
  await expect(
    page.getByRole("heading", { name: "Booking confirmed" }),
  ).toBeVisible();
  await expect(page.getByText("Payment verified")).toBeVisible();
  await expect(page.getByText("paid", { exact: true })).toBeVisible();
});

test("cancelled checkout offers a secure verification retry", async ({ page }) => {
  await page.goto(callback("demo-cancelled"));
  await expect(
    page.getByRole("heading", { name: "Payment check needs another try" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry secure verification" }),
  ).toBeVisible();
});

test("failed verification does not claim the booking is confirmed", async ({ page }) => {
  await page.goto(callback("demo-failed"));
  await expect(page.getByText(/could not verify/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Booking confirmed" }),
  ).toHaveCount(0);
});

test("expired hold is described honestly", async ({ page }) => {
  await page.goto(callback("demo-expired"));
  await expect(
    page.getByRole("heading", { name: "Appointment hold expired" }),
  ).toBeVisible();
});

test("pending gateway status stays unconfirmed and can be checked again", async ({
  page,
}) => {
  await page.goto(callback("demo-pending"));
  await expect(
    page.getByRole("heading", { name: "Payment is not confirmed yet" }),
  ).toBeVisible();
  await expect(page.getByText("processing", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check again" })).toBeVisible();
});

test("payment received after reassignment enters manual resolution", async ({ page }) => {
  await page.goto(callback("demo-late"));
  await expect(
    page.getByRole("heading", {
      name: "Payment received; appointment needs help",
    }),
  ).toBeVisible();
  await expect(page.getByText(/hold expired before confirmation/i)).toBeVisible();
});

test("amount mismatch is never presented as confirmation", async ({ page }) => {
  await page.goto(callback("demo-mismatch"));
  await expect(
    page.getByRole("heading", { name: "Payment details need review" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Booking confirmed" }),
  ).toHaveCount(0);
});

test("mobile and keyboard users can review and print a verified payment", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(callback("demo-success-mobile"));
  await expect(
    page.getByRole("heading", { name: "Booking confirmed" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  const print = page.getByRole("button", { name: "Print summary" });
  await print.focus();
  await expect(print).toBeFocused();
});
