import { expect, test, type Page } from "@playwright/test";

async function acceptPolicy(page: Page, url = "/#/booking") {
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Before we reserve clinic time" }),
  ).toBeVisible();
  await page.getByTestId("policy-consent").check();
  await page.getByRole("button", { name: /Start booking/ }).click();
}

async function chooseSalonService(page: Page) {
  await page.getByTestId("category-salon").click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: /Natural hair care/ }).click();
}

async function chooseTrichologyService(page: Page) {
  await page.getByTestId("category-trichology").click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: /Trichology consultation/ }).click();
}

async function chooseSchedule(
  page: Page,
  category: "salon" | "trichology" = "salon",
) {
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.locator('[role="gridcell"]:not([disabled])').first().click();
  if (category === "salon") {
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Morning Session/ })
      .click();
  } else {
    await page.locator(".time-slot").first().click();
  }
  await page.getByRole("button", { name: /^Continue/ }).click();
}

async function fillSalonDetails(page: Page) {
  await page.getByLabel("Full name *").fill("Adaeze Nwosu");
  await page.getByLabel("Phone *").fill("08012345678");
  await page.getByLabel("Email *").fill("adaeze@example.com");
}

async function reachPayment(
  page: Page,
  category: "salon" | "trichology" = "salon",
) {
  await acceptPolicy(page);
  if (category === "salon") await chooseSalonService(page);
  else await chooseTrichologyService(page);
  await chooseSchedule(page, category);
  if (category === "salon") await fillSalonDetails(page);
  else {
    await page.getByLabel("Full name *").fill("Amara Okafor");
    await page.getByLabel("Phone *").fill("08012345678");
    await page.getByLabel("Email *").fill("amara@example.com");
  }
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
}

test("1 policy acknowledgement is required before the stepper", async ({
  page,
}) => {
  await page.goto("/#/booking");
  await expect(
    page.getByRole("button", { name: /Start booking/ }),
  ).toBeDisabled();
  await expect(page.getByLabel("Booking progress")).toHaveCount(0);
});

test("2 policy consent opens the six-step category screen", async ({
  page,
}) => {
  await acceptPolicy(page);
  await expect(page.getByLabel("Booking progress")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /What kind of care/ }),
  ).toBeVisible();
});

test("3 service deep link preselects category and starts at Service after policy", async ({
  page,
}) => {
  await acceptPolicy(page, "/#/booking?service=svc-consult");
  await expect(
    page.getByRole("heading", { name: "Choose your main service" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Trichology consultation/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("4 category filters services", async ({ page }) => {
  await acceptPolicy(page);
  await page.getByTestId("category-salon").click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(
    page.getByRole("button", { name: /Natural hair care/ }),
  ).toBeVisible();
  await expect(page.getByText("Demo service").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Demo Salon booking/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Hair treatments/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Trichology consultation/ }),
  ).toHaveCount(0);
});

test("5 not-sure action selects general trichology consultation", async ({
  page,
}) => {
  await acceptPolicy(page);
  await page.getByTestId("category-trichology").click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: /I’m not sure/ }).click();
  await expect(
    page.getByRole("button", { name: /Trichology consultation/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("6 extras update duration and subtotal", async ({ page }) => {
  await acceptPolicy(page);
  await chooseSalonService(page);
  await expect(
    page.getByRole("button", { name: /Step 2: Service/ }),
  ).toHaveAttribute("aria-current", "step");
  await expect(
    page.getByRole("button", { name: /Step 3: Extras/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Optional extras" }),
  ).toBeVisible();
  await expect(
    page.getByText("Wig Installation Service", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Hair Trims", { exact: true })).toBeVisible();
  await page.getByText("Clay detox", { exact: true }).click();
  await expect(
    page.getByRole("complementary").getByText("150 min"),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary").getByText("₦32,500"),
  ).toBeVisible();
});

test("7 booking can continue without extras", async ({ page }) => {
  await acceptPolicy(page);
  await chooseSalonService(page);
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a Salon session" }),
  ).toBeVisible();
});

test("8 changing service clears later selections with an explanation", async ({
  page,
}) => {
  await acceptPolicy(page);
  await chooseSalonService(page);
  await page.getByText("Clay detox", { exact: true }).click();
  await page.getByRole("button", { name: /Step 2: Service/ }).click();
  await page
    .getByRole("button", { name: /Hair treatments/ })
    .click();
  await expect(page.getByText(/cleared extras and schedule/)).toBeVisible();
});

test("9 Salon calendar shows combined spaces and opens the three-session picker", async ({
  page,
}) => {
  await acceptPolicy(page);
  await chooseSalonService(page);
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.locator('[role="gridcell"][disabled]')).not.toHaveCount(0);
  const availableDay = page.locator('[role="gridcell"]:not([disabled])').first();
  await expect(availableDay).toHaveAccessibleName(/9 spaces remaining/);
  await availableDay.click();
  const dialog = page.getByRole("dialog", { name: "Choose a session" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: /Morning Session.*3 of 3 spaces left/,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: /Afternoon Session.*3 of 3 spaces left/,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: /Evening Session.*3 of 3 spaces left/,
    }),
  ).toBeVisible();
});

test("9b Trichology retains precise calculated start times", async ({ page }) => {
  await acceptPolicy(page);
  await chooseTrichologyService(page);
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.locator('[role="gridcell"]:not([disabled])').first().click();
  await expect(page.locator(".time-slot").first()).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Choose a session" })).toHaveCount(0);
});

test("10 details require only full name, phone and email", async ({ page }) => {
  await acceptPolicy(page);
  await chooseSalonService(page);
  await chooseSchedule(page);
  await expect(page.getByRole("button", { name: /^Continue/ })).toBeDisabled();
  await expect(
    page.getByLabel("Main hair or scalp concern (optional)"),
  ).toBeVisible();
  await fillSalonDetails(page);
  await expect(page.getByRole("button", { name: /^Continue/ })).toBeEnabled();
});

test("11 conditional trichology intake appears", async ({ page }) => {
  await acceptPolicy(page);
  await chooseTrichologyService(page);
  await chooseSchedule(page, "trichology");
  await page
    .getByLabel(/discussed this concern/)
    .selectOption({ label: "Yes" });
  await expect(page.getByLabel(/relevant diagnosis/)).toBeVisible();
});

test("12 optional photo rejects invalid type without upload", async ({
  page,
}) => {
  await acceptPolicy(page);
  await chooseTrichologyService(page);
  await chooseSchedule(page, "trichology");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "notes.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("test"),
    });
  await expect(page.getByText(/Use a JPG, PNG or WebP/)).toBeVisible();
  await expect(page.getByText(/Demo preview only/)).toBeVisible();
});

test("13 draft survives refresh", async ({ page }) => {
  await acceptPolicy(page);
  await page.getByTestId("category-salon").click();
  await page.reload();
  await expect(page.getByTestId("category-salon")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("14 summary edits return to the selected section", async ({ page }) => {
  await acceptPolicy(page);
  await chooseSalonService(page);
  await chooseSchedule(page);
  await fillSalonDetails(page);
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: "Edit schedule" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a Salon session" }),
  ).toBeVisible();
});

test("15 deposit mode shows due now and balance", async ({ page }) => {
  await reachPayment(page);
  await expect(page.getByText("Due now").nth(1)).toBeVisible();
  await expect(
    page.locator("main").getByText(/Balance due at the clinic/),
  ).toBeVisible();
});

test("16 failed mock payment can be retried", async ({ page }) => {
  await reachPayment(page);
  await page.getByRole("button", { name: "Test failed payment" }).click();
  await expect(page.getByRole("alert")).toContainText("payment failed");
  await expect(
    page.getByRole("button", { name: "Retry payment" }),
  ).toBeVisible();
});

test("17 pay-at-clinic creates a pending-confirmation request", async ({
  page,
}) => {
  await reachPayment(page);
  await page.getByText("Pay at clinic", { exact: true }).click();
  await page.getByRole("button", { name: "Confirm booking request" }).click();
  await expect(
    page.getByRole("heading", { name: /awaiting confirmation/ }),
  ).toBeVisible();
  await expect(page.getByText("pending-confirmation")).toBeVisible();
});

test("18 paid deposit creates receipt and calendar action", async ({
  page,
}) => {
  await reachPayment(page);
  await page.getByRole("button", { name: /^Pay ₦/ }).click();
  await expect(
    page.getByRole("heading", { name: /awaiting confirmation/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add to calendar" }),
  ).toHaveAttribute("download", /TAM-/);
});

test("19 mobile shows compact step copy and collapsible summary", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await acceptPolicy(page);
  await expect(page.getByText("Step 1 of 6 — Category")).toBeVisible();
  await expect(page.getByText("Booking summary")).toBeVisible();
});

test("20 admin filters guest bookings without exposing a customer account", async ({
  page,
}) => {
  await page.goto("/#/admin/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Bookings" }).click();
  await expect(
    page.getByPlaceholder(/Search reference, name, email/),
  ).toBeVisible();
  await expect(page.getByLabel("Filter category")).toBeVisible();
  await page.goto("/#/booking");
  await expect(
    page.getByText(/sign in|create account|promo code|choose location/i),
  ).toHaveCount(0);
});
