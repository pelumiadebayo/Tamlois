import { expect, test, type Page } from "@playwright/test";

async function openHome(page: Page) {
  await page.goto("/#/");
  await expect(
    page.getByRole("heading", {
      name: "Understand your scalp. Care for your hair with confidence.",
    }),
  ).toBeVisible();
}

async function acceptPolicy(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Before we reserve clinic time" }),
  ).toBeVisible();
  await page.getByTestId("policy-consent").check();
  await page.getByRole("button", { name: /Start booking/ }).click();
}

test("1 desktop Care Loop keeps its promise stable while offerings change", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openHome(page);
  await expect(page.locator(".care-loop-rail")).toBeHidden();
  await expect(page.locator(".care-loop-controls")).not.toContainText(/[1-4]\/4/);
  await expect(page.locator(".care-loop-controls button")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Pause Care Loop" }),
  ).toHaveText("");
  await expect(
    page
      .locator(".care-loop-actions")
      .getByRole("link", { name: "Book a salon service", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Book a salon service from offering card",
    }),
  ).toHaveAttribute("href", /booking\?category=salon/);
  const stage = await page.locator(".care-loop-stage").boundingBox();
  const offeringCard = await page.locator(".care-loop-offering").boundingBox();
  expect(stage).not.toBeNull();
  expect(offeringCard).not.toBeNull();
  expect(stage!.y + stage!.height).toBeLessThanOrEqual(768);
  expect(offeringCard!.height).toBeLessThan(stage!.height * 0.5);
  await page
    .getByRole("button", {
      name: "Show next offering and resume: Trichology Care",
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Clinical insight for healthier hair and scalp",
    }),
  ).toBeVisible();
  await expect(
    page
      .locator(".care-loop-actions")
      .getByRole("link", {
        name: "Book a trichology consultation",
        exact: true,
      }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Understand your scalp. Care for your hair with confidence.",
    }),
  ).toBeVisible();
});

test("2 Trichology CTA opens booking with category preselected", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);
  await page.evaluate(() => {
    sessionStorage.setItem(
      "tamlois-booking-draft-v2",
      JSON.stringify({
        sessionId: "persisted-salon-draft",
        step: 3,
        category: "salon",
        serviceId: "svc-natural",
        extraIds: [],
        date: "2026-09-02",
        time: "10:00",
        details: {},
        intakeResponses: {},
        updatedAt: new Date().toISOString(),
      }),
    );
  });
  await page.getByRole("button", { name: /^02 Trichology Care$/ }).click();
  await page
    .locator(".care-loop-actions")
    .getByRole("link", {
      name: "Book a trichology consultation",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/#\/booking\?category=trichology/);
  await acceptPolicy(page);
  await expect(
    page.getByRole("heading", { name: "Choose your main service" }),
  ).toBeVisible();
  for (const service of [
    "Scalp analysis",
    "Trichology consultation",
    "Scalp therapy",
    "Hair-loss management",
  ]) {
    await expect(
      page.getByRole("button", { name: new RegExp(service) }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: /Hair treatments/ }),
  ).toHaveCount(0);
  await expect(page.getByTestId("category-trichology")).toHaveCount(0);
});

test("3 Salon CTA opens booking with category preselected", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);
  await page
    .locator(".care-loop-actions")
    .getByRole("link", { name: "Book a salon service", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/booking\?category=salon/);
  await acceptPolicy(page);
  await expect(
    page.getByRole("heading", { name: "Choose your main service" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Hair treatments/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Natural hair care/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Scalp analysis/ }),
  ).toHaveCount(0);
  await expect(page.getByTestId("category-salon")).toHaveCount(0);
});

test("4 Products CTA opens the shop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);
  await page
    .getByRole("button", { name: /^03 Hair & Scalp Products$/ })
    .click();
  await page
    .locator(".care-loop-actions")
    .getByRole("link", { name: "Shop hair and scalp care", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/shop$/);
});

test("5 Gallery CTA opens the filterable gallery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);
  await page.getByRole("button", { name: /^04 Gallery & Results$/ }).click();
  await page
    .locator(".care-loop-actions")
    .getByRole("link", { name: "Explore the gallery", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/gallery$/);
  await expect(
    page.getByRole("button", { name: "Trichology", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Products", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/clean placeholder arrangement/i)).toHaveCount(0);
});

test("6 arrow keys select and focus the next offering", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);
  const first = page.getByRole("button", { name: /Natural Hair Salon/ });
  await first.focus();
  await first.press("ArrowDown");
  const trichology = page.getByRole("button", {
    name: /^02 Trichology Care$/,
  });
  await expect(trichology).toBeFocused();
  await expect(trichology).toHaveAttribute("aria-pressed", "true");
});

test("7 pause and play controls expose their current state", async ({
  page,
}) => {
  await openHome(page);
  const pause = page.getByRole("button", { name: "Pause Care Loop" });
  await expect(pause).toHaveAttribute("aria-pressed", "false");
  await pause.click();
  const play = page.getByRole("button", { name: "Play Care Loop" });
  await expect(play).toHaveAttribute("aria-pressed", "true");
  await expect(play).toHaveText("");
  await page
    .getByRole("button", {
      name: "Show next offering and resume: Trichology Care",
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause Care Loop" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(6800);
  await expect(
    page.getByRole("heading", {
      name: "Shop our Hair and Scalp Care Products",
    }),
  ).toBeVisible();
});

test("8 reduced motion keeps the loop manual", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page);
  await expect(
    page.getByRole("button", { name: "Play Care Loop" }),
  ).toBeDisabled();
  await page.waitForTimeout(6800);
  await expect(
    page.getByRole("heading", {
      name: "Professional care & styling for natural hair",
    }),
  ).toBeVisible();
});

test("9 mobile selector supports horizontal swipe selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);
  await expect(page.getByRole("group", { name: /Explore/ })).toHaveAttribute(
    "data-orientation",
    "horizontal",
  );
  const stage = page.locator(".care-loop-stage");
  await stage.dispatchEvent("touchstart", {
    changedTouches: [{ identifier: 0, clientX: 300, clientY: 300 }],
  });
  await stage.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 0, clientX: 190, clientY: 300 }],
  });
  await expect(
    page.getByRole("button", { name: /^02 Trichology Care$/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("10 homepage has no horizontal overflow at desktop or mobile widths", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 950 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await openHome(page);
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  }
});

test("11 focus within the Care Loop pauses automatic advancement", async ({
  page,
}) => {
  await openHome(page);
  await page
    .locator(".care-loop-actions")
    .getByRole("link", { name: "Book a salon service", exact: true })
    .focus();
  await page.waitForTimeout(6800);
  await expect(
    page.getByRole("heading", {
      name: "Professional care & styling for natural hair",
    }),
  ).toBeVisible();
});

test("12 unavailable images retain useful copy and an accessible fallback", async ({
  page,
}) => {
  await page.route(/images\.pexels\.com/, (route) => route.abort());
  await openHome(page);
  await expect(page.getByText("Image unavailable").first()).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Professional care & styling for natural hair",
    }),
  ).toBeVisible();
});
